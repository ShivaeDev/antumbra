import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events.ts";
import { Option, Schema } from "effect";
import { claudeRaw } from "#raw-payload.ts";
import { type AdoptedAgent, admissionEvents } from "#workflow-adoption.ts";

const Stamped = Schema.Struct({ uuid: Schema.String });
const stampedLine = Schema.decodeUnknownOption(Schema.fromJsonString(Stamped));

// Claude reuses each transcript line's UUID on the corresponding forwarded frame.
const uuidOf = (payload: string): ReadonlyArray<string> =>
	Option.match(stampedLine(payload), {
		onNone: () => [],
		onSome: (line) => [line.uuid],
	});

const missedLines = (nodeRef: string, missing: ReadonlyArray<string>, stored: number): AgentEvent => ({
	detail: `${missing.length} of ${stored} transcript lines the provider stored for this node never reached the record`,
	gapKind: "unknown",
	raw: claudeRaw("subagent/unrecorded-lines", { agentId: nodeRef, missing }),
	type: "subsession.gap",
});

export const transcriptFindings = (
	nodeRef: string,
	stored: ReadonlyArray<SessionMessage>,
	recorded: ReadonlyArray<string>,
): ReadonlyArray<AgentEvent> => {
	const delivered = new Set(recorded.flatMap(uuidOf));
	const missing = stored.map((message) => message.uuid).filter((uuid) => !delivered.has(uuid));
	return missing.length === 0 ? [] : [missedLines(nodeRef, missing, stored.length)];
};

const censusMissing = (agent: AdoptedAgent, origin: Origin): AgentEvent => ({
	detail: `only a census of the provider's subagents directory found this node; the stream never carried it, and ${agent.messages.length} messages were read back from its transcript`,
	gapKind: "census-missing",
	origin,
	raw: claudeRaw("subagent/census-missing", { agentId: agent.agentId }),
	type: "subsession.gap",
});

export const censusFindings = (found: ReadonlyArray<AdoptedAgent>): ReadonlyArray<AgentEvent> =>
	found.flatMap((agent) => admissionEvents(agent, censusMissing));

export const censusUnreadable = (failure: string): AgentEvent => ({
	detail: `the provider's subagents directory could not be listed, so this session's census could not be taken: ${failure}`,
	gapKind: "unknown",
	raw: claudeRaw("subagent/census-unreadable", { failure }),
	type: "subsession.gap",
});
