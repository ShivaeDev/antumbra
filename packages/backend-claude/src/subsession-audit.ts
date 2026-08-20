import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { Option, Schema } from "effect";
import { claudeRaw } from "#raw-payload.ts";
import { type AdoptedAgent, admissionEvents } from "#workflow-adoption.ts";

const Stamped = Schema.Struct({ uuid: Schema.String });
const stampedLine = Schema.decodeUnknownOption(Schema.fromJsonString(Stamped));

// why: the provider stamps every frame it forwards with the uuid it writes into
// its own transcript, so the two are the same identity read from two places.
// That is what makes the comparison possible at all — and it is read out of the
// provider bytes this lane journaled, because only this lane knows what a line
// of its own transcript is called. Bytes that carry no uuid name no line, and
// name nothing missing either.
const uuidOf = (payload: string): ReadonlyArray<string> =>
	Option.match(stampedLine(payload), {
		onNone: () => [],
		onSome: (line) => [line.uuid],
	});

// why: a line the provider stored that the record never received is a hole with
// no name of its own here — nothing was truncated, no stream detached, the
// frame simply never arrived. It takes the escape hatch with a detail saying
// plainly what was missed, and never a neighbour's word.
const missedLines = (
	nodeRef: string,
	missing: ReadonlyArray<string>,
	stored: number,
): AgentEvent => ({
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
	const missing = stored
		.map((message) => message.uuid)
		.filter((uuid) => !delivered.has(uuid));
	return missing.length === 0
		? []
		: [missedLines(nodeRef, missing, stored.length)];
};

// why: an agent standing in the provider's own subagents directory that the
// live path never admitted is the regression this census exists to catch — a
// provider that quietly stops forwarding delegated frames shows up here and
// nowhere else. The detail says what was missed so the signal stays legible.
const censusMissing = (agent: AdoptedAgent, origin: Origin): AgentEvent => ({
	detail: `only a census of the provider's subagents directory found this node; the stream never carried it, and ${agent.messages.length} messages were read back from its transcript`,
	gapKind: "census-missing",
	origin,
	raw: claudeRaw("subagent/census-missing", { agentId: agent.agentId }),
	type: "subsession.gap",
});

export const censusFindings = (
	found: ReadonlyArray<AdoptedAgent>,
): ReadonlyArray<AgentEvent> =>
	found.flatMap((agent) => admissionEvents(agent, censusMissing));

// why: a census that could not be taken leaves the record unable to say whether
// it saw everything, which is itself a fact about how complete this Session is.
export const censusUnreadable = (failure: string): AgentEvent => ({
	detail: `the provider's subagents directory could not be listed, so this session's census could not be taken: ${failure}`,
	gapKind: "unknown",
	raw: claudeRaw("subagent/census-unreadable", { failure }),
	type: "subsession.gap",
});
