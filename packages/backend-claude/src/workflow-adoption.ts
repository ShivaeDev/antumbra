import type { SessionMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events.ts";
import { agentFileRef } from "#mirror-keys.ts";
import { claudeRaw } from "#raw-payload.ts";
import { transcriptEvents } from "#workflow-transcript.ts";

export interface AdoptedAgent {
	readonly agentId: string;
	readonly messages: ReadonlyArray<SessionMessage>;
}

export interface Repair {
	readonly agents: ReadonlyArray<AdoptedAgent>;
	readonly failure: string | undefined;
}

const admissionOrigin = (agent: AdoptedAgent): Origin => ({
	node: agent.agentId,
	spawnedBy: agent.messages[0]?.parent_tool_use_id ?? agentFileRef(agent.agentId),
});

const adoptedGap = (agent: AdoptedAgent, origin: Origin): AgentEvent => ({
	detail: `this node was read back from its stored transcript after the live record missed it, ${agent.messages.length} messages already written`,
	gapKind: "adopted-late",
	origin,
	raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
	type: "subsession.gap",
});

const adoptedEnding = (agent: AdoptedAgent): AgentEvent => ({
	outcome: "unknown",
	raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
	subsessionRef: agent.agentId,
	type: "subsession.ended",
});

export const censusGap = (failure: string): AgentEvent => ({
	detail: `subagent backfill source unreachable; this session's workflow census could not be checked: ${failure}`,
	gapKind: "unknown",
	raw: claudeRaw("workflow/census-unreadable", { failure }),
	type: "subsession.gap",
});

export const admissionEvents = (agent: AdoptedAgent, loss: (agent: AdoptedAgent, origin: Origin) => AgentEvent): ReadonlyArray<AgentEvent> => {
	if (agent.messages.length === 0) {
		return [];
	}
	const origin = admissionOrigin(agent);
	return [
		{
			raw: claudeRaw("workflow/adopted-late", { agentId: agent.agentId }),
			spawnedBy: origin.spawnedBy,
			subsessionRef: agent.agentId,
			type: "subsession.opened",
		},
		loss(agent, origin),
		...agent.messages.flatMap((message) => transcriptEvents(message, origin)),
		adoptedEnding(agent),
	];
};

export const adoptedEvents = (agent: AdoptedAgent): ReadonlyArray<AgentEvent> => admissionEvents(agent, adoptedGap);
