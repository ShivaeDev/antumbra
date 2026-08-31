import { getSubagentMessages, listSubagents } from "@anthropic-ai/claude-agent-sdk";
import type { NodeAuditRequest, SessionAudit, SessionCensusRequest } from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";
import { censusFindings, censusUnreadable, transcriptFindings } from "#subsession-audit.ts";
import type { AdoptedAgent } from "#workflow-adoption.ts";

const readAgent = async (request: SessionCensusRequest, agentId: string): Promise<AdoptedAgent> => ({
	agentId,
	messages: await getSubagentMessages(request.rootRef, agentId, {
		dir: request.cwd,
	}),
});

const takeCensus = async (request: SessionCensusRequest): Promise<ReadonlyArray<AgentEvent>> => {
	try {
		const directory = await listSubagents(request.rootRef, {
			dir: request.cwd,
		});
		const missed = directory.filter((agentId) => !request.admitted(agentId));
		return censusFindings(await Promise.all(missed.map((agentId) => readAgent(request, agentId))));
	} catch (error) {
		return [censusUnreadable(String(error))];
	}
};

const auditNode = async (request: NodeAuditRequest, recorded: ReadonlyArray<string>): Promise<ReadonlyArray<AgentEvent>> => {
	try {
		const stored = await getSubagentMessages(request.rootRef, request.nodeRef, {
			dir: request.cwd,
		});
		return transcriptFindings(request.nodeRef, stored, recorded);
	} catch (error) {
		return [censusUnreadable(String(error))];
	}
};

// Reconnect waits on provider-storage reads; bound them so a stalled read cannot
// hold message delivery indefinitely. A timeout is unreadable, never an empty census.
const AUDIT_PATIENCE_MILLIS = 20_000;

const inTime = (read: Effect.Effect<ReadonlyArray<AgentEvent>>, said: string): Effect.Effect<ReadonlyArray<AgentEvent>> =>
	read.pipe(
		Effect.timeoutOrElse({
			duration: AUDIT_PATIENCE_MILLIS,
			orElse: () => Effect.succeed([censusUnreadable(said)]),
		}),
	);

export const claudeAudit: SessionAudit = {
	census: (request) =>
		Effect.map(
			inTime(
				Effect.promise(() => takeCensus(request)),
				`the census of ${request.rootRef} did not answer in time`,
			),
			(events) => ({ events, nodes: [] }),
		),
	node: (request) =>
		Effect.flatMap(request.recorded, (recorded) =>
			inTime(
				Effect.promise(() => auditNode(request, recorded)),
				`the transcript of ${request.nodeRef} did not answer in time`,
			),
		),
};
