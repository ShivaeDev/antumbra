import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { agentFileRef } from "#mirror-keys.ts";
import { claudeRaw } from "#raw-payload.ts";
import { transcriptEvents } from "#workflow-transcript.ts";

export interface AdoptedAgent {
	readonly agentId: string;
	readonly messages: ReadonlyArray<SessionMessage>;
}

// why: a census either answers or it does not, and both are facts about how
// complete this Session's record is. The failure travels beside the agents so
// the lane can write it down instead of a caller having to remember to ask.
export interface Repair {
	readonly agents: ReadonlyArray<AdoptedAgent>;
	readonly failure: string | undefined;
}

const originOf = (agent: AdoptedAgent): Origin => ({
	node: agent.agentId,
	spawnedBy:
		agent.messages[0]?.parent_tool_use_id ?? agentFileRef(agent.agentId),
});

// why: a node adopted from a stored transcript existed before the record knew
// it, so its own journal says so before it says anything else. Without that
// line the transcript would read as work done after the row was written, which
// is the one thing the timestamps would never support.
const adoptedGap = (agent: AdoptedAgent, origin: Origin): AgentEvent => ({
	detail: `this node was read back from its stored transcript after the live record missed it, ${agent.messages.length} messages already written`,
	gapKind: "adopted-late",
	origin,
	raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
	type: "subsession.gap",
});

// why: the repair source is the transcript and nothing else — it says what the
// agent did and never how the run judged it, so the ending is recorded as
// unknown rather than inferred from the transcript having stopped.
const adoptedEnding = (agent: AdoptedAgent): AgentEvent => ({
	outcome: "unknown",
	raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
	subsessionRef: agent.agentId,
	type: "subsession.ended",
});

// why: a census that could not be taken leaves the record unable to say
// whether it saw everything, and a session that ends looking complete when it
// is not is the failure this whole lane exists to prevent. The kind is the
// escape hatch on purpose: nothing here found a missing node, the question was
// never put, and a loss with no name of its own is written as unknown with the
// detail saying plainly what happened rather than borrowed from a neighbour.
export const censusGap = (failure: string): AgentEvent => ({
	detail: `subagent backfill source unreachable; this session's workflow census could not be checked: ${failure}`,
	gapKind: "unknown",
	raw: claudeRaw("workflow/census-unreadable", { failure }),
	type: "subsession.gap",
});

// why: an agent the live mirror never delivered is still part of what this
// Session did, and its transcript outlives the process that failed to forward
// it. Kind is left unsaid: the repair source names the agent and its words,
// never what the run asked it to be.
export const adoptedEvents = (
	agent: AdoptedAgent,
): ReadonlyArray<AgentEvent> => {
	if (agent.messages.length === 0) {
		return [];
	}
	const origin = originOf(agent);
	return [
		{
			raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
			spawnedBy: origin.spawnedBy,
			subsessionRef: agent.agentId,
			type: "subsession.opened",
		},
		adoptedGap(agent, origin),
		...agent.messages.flatMap((message) => transcriptEvents(message, origin)),
		adoptedEnding(agent),
	];
};
