import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { type WorkflowAgentRef, workflowRunRef } from "#mirror-keys.ts";
import { claudeRaw } from "#raw-payload.ts";
import type {
	WorkflowIdentities,
	WorkflowIdentity,
} from "#workflow-identity.ts";

const KIND = "workflow_agent";

interface NodeState {
	named: boolean;
	settled: boolean;
}

export interface WorkflowNodes {
	readonly known: (agentId: string) => boolean;
	readonly opened: (ref: WorkflowAgentRef) => ReadonlyArray<AgentEvent>;
	readonly originOf: (ref: WorkflowAgentRef) => Origin;
	readonly settled: () => ReadonlyArray<AgentEvent>;
}

const openedEvent = (
	ref: WorkflowAgentRef,
	identity: WorkflowIdentity | undefined,
	spawnedBy: string,
): AgentEvent => ({
	kind: KIND,
	...(identity?.label === undefined ? {} : { label: identity.label }),
	raw: claudeRaw("workflow/agent", { ...ref, ...identity }),
	spawnedBy,
	subsessionRef: ref.agentId,
	type: "subsession.opened",
});

// why: a workflow's agents are nodes of the Session that ran the workflow, and
// the only place they say anything is the mirrored transcript. A node is opened
// the moment its first words arrive rather than held until the run names it:
// holding would risk losing the words, and a name that arrives late fills a
// hole the opening left rather than replacing anything.
export const openWorkflowNodes = (
	identities: WorkflowIdentities,
): WorkflowNodes => {
	const nodes = new Map<string, NodeState>();
	const spawnerOf = (ref: WorkflowAgentRef): string =>
		identities.of(ref.agentId)?.spawnedBy ?? workflowRunRef(ref.runId);
	const opened = (ref: WorkflowAgentRef): ReadonlyArray<AgentEvent> => {
		const identity = identities.of(ref.agentId);
		const state = nodes.get(ref.agentId);
		if (state === undefined) {
			nodes.set(ref.agentId, {
				named: identity?.label !== undefined,
				settled: false,
			});
			return [openedEvent(ref, identity, spawnerOf(ref))];
		}
		if (state.named || identity?.label === undefined) {
			return [];
		}
		state.named = true;
		return [openedEvent(ref, identity, spawnerOf(ref))];
	};
	// why: an agent's ending is a fact the run reports, not one its transcript
	// spells out, so it is drawn from the identity the run keeps rather than
	// waiting for a mirrored line that may never come. Only a node this lane has
	// already announced can end, so telemetry alone never mints one.
	const settled = (): ReadonlyArray<AgentEvent> =>
		[...nodes].flatMap(([agentId, state]) => {
			const ending = identities.of(agentId)?.ended;
			if (state.settled || ending === undefined) {
				return [];
			}
			state.settled = true;
			return [
				{
					outcome: ending,
					raw: claudeRaw("workflow/agent-ended", {
						agentId,
						...identities.of(agentId),
					}),
					subsessionRef: agentId,
					type: "subsession.ended",
				} satisfies AgentEvent,
			];
		});
	return {
		known: (agentId) => nodes.has(agentId),
		opened,
		originOf: (ref) => ({ node: ref.agentId, spawnedBy: spawnerOf(ref) }),
		settled,
	};
};
