import {
	getSubagentMessages,
	listSubagents,
} from "@anthropic-ai/claude-agent-sdk";
import type {
	NodeAuditRequest,
	SessionAudit,
	SessionCensusRequest,
} from "@antumbra/plugin-api";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import { Effect } from "effect";
import {
	censusFindings,
	censusUnreadable,
	transcriptFindings,
} from "#subsession-audit.ts";
import type { AdoptedAgent } from "#workflow-adoption.ts";

const readAgent = async (
	request: SessionCensusRequest,
	agentId: string,
): Promise<AdoptedAgent> => ({
	agentId,
	messages: await getSubagentMessages(request.rootRef, agentId, {
		dir: request.cwd,
	}),
});

// why: the census reads only agents the record never admitted — the rest are
// already in the log, and reading them back would write every word twice.
const takeCensus = async (
	request: SessionCensusRequest,
): Promise<ReadonlyArray<AgentEvent>> => {
	try {
		const directory = await listSubagents(request.rootRef, {
			dir: request.cwd,
		});
		const missed = directory.filter((agentId) => !request.admitted(agentId));
		return censusFindings(
			await Promise.all(missed.map((agentId) => readAgent(request, agentId))),
		);
	} catch (error) {
		return [censusUnreadable(String(error))];
	}
};

// why: the provider keeps no second copy for every node, and an empty read is
// that rather than a loss — there is simply nothing to compare the journal
// against. Only lines the provider did store and the record never received are
// a finding.
const auditNode = async (
	request: NodeAuditRequest,
	recorded: ReadonlyArray<string>,
): Promise<ReadonlyArray<AgentEvent>> => {
	try {
		const stored = await getSubagentMessages(request.rootRef, request.nodeRef, {
			dir: request.cwd,
		});
		return transcriptFindings(request.nodeRef, stored, recorded);
	} catch (error) {
		return [censusUnreadable(String(error))];
	}
};

// why: the audit's sanctioned read of the provider's own storage. Acquisition
// still never tails disk — this runs after a node has stopped talking, asks
// what the provider kept, and compares it with what the record holds.
export const claudeAudit: SessionAudit = {
	census: (request) => Effect.promise(() => takeCensus(request)),
	node: (request) =>
		Effect.flatMap(request.recorded, (recorded) =>
			Effect.promise(() => auditNode(request, recorded)),
		),
};
