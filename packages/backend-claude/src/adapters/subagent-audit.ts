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

// why: the census reads only agents the record never admitted — the rest are
// already in the log, and reading them back would write every word twice.
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

// why: the provider keeps no second copy for every node, and an empty read is
// that rather than a loss — there is simply nothing to compare the journal
// against. Only lines the provider did store and the record never received are
// a finding.
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

// why: both reads reach the provider's own storage on disk, and a read that
// never comes back is not a slow answer but no answer at all. The reconnect
// census runs inside the attachment a resume is opening, so an unbounded one
// holds the admiral's words behind a directory listing. Not being able to ask
// in time is the same fact about the record as not being able to ask, and the
// lane already has the word for it — so the deadline degrades to a gap rather
// than to an empty reading, which would say the provider kept nothing.
const AUDIT_PATIENCE_MILLIS = 20_000;

const inTime = (read: Effect.Effect<ReadonlyArray<AgentEvent>>, said: string): Effect.Effect<ReadonlyArray<AgentEvent>> =>
	read.pipe(
		Effect.timeoutOrElse({
			duration: AUDIT_PATIENCE_MILLIS,
			orElse: () => Effect.succeed([censusUnreadable(said)]),
		}),
	);

// why: the audit's sanctioned read of the provider's own storage. Acquisition
// still never tails disk — this runs after a node has stopped talking, asks
// what the provider kept, and compares it with what the record holds.
export const claudeAudit: SessionAudit = {
	// why: this provider says when a delegated agent finished, on the stream that
	// carried it, so nothing here needs a second word on which children are
	// running. The census lists nobody and speaks only about what was missed.
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
