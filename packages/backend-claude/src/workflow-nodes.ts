import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
import { type WorkflowAgentRef, workflowRunRef } from "#mirror-keys.ts";
import { claudeRaw } from "#raw-payload.ts";
import type { WorkflowIdentities, WorkflowIdentity } from "#workflow-identity.ts";

const KIND = "workflow_agent";

interface NodeState {
	named: boolean;
	settled: boolean;
}

interface WorkflowNodes {
	readonly known: (agentId: string) => boolean;
	readonly opened: (ref: WorkflowAgentRef) => ReadonlyArray<AgentEvent>;
	readonly originOf: (ref: WorkflowAgentRef) => Origin;
	readonly settled: () => ReadonlyArray<AgentEvent>;
}

const openedEvent = (ref: WorkflowAgentRef, identity: WorkflowIdentity | undefined, spawnedBy: string): AgentEvent => ({
	kind: KIND,
	...(identity?.label === undefined ? {} : { label: identity.label }),
	raw: claudeRaw("workflow/agent", { ...ref, ...identity }),
	spawnedBy,
	subsessionRef: ref.agentId,
	type: "subsession.opened",
});

export const openWorkflowNodes = (identities: WorkflowIdentities): WorkflowNodes => {
	const nodes = new Map<string, NodeState>();
	const spawnerOf = (ref: WorkflowAgentRef): string => identities.of(ref.agentId)?.spawnedBy ?? workflowRunRef(ref.runId);
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
