import type { SDKMessage, SessionKey, SessionStoreEntry } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events.ts";
import { openSessionMapping } from "#mapping.ts";
import { subagentRef, workflowAgentRef } from "#mirror-keys.ts";
import { adoptedEvents, censusGap, type Repair } from "#workflow-adoption.ts";
import { openWorkflowIdentities } from "#workflow-identity.ts";
import { openWorkflowNodes } from "#workflow-nodes.ts";
import { openWorkflowResults } from "#workflow-results.ts";
import { transcriptEvents } from "#workflow-transcript.ts";

export interface MirrorWrite {
	readonly entries: ReadonlyArray<SessionStoreEntry>;
	readonly key: SessionKey;
}

export type Delivery =
	| { readonly kind: "frame"; readonly message: SDKMessage }
	| { readonly kind: "mirror"; readonly write: MirrorWrite }
	| { readonly kind: "repair"; readonly repair: Repair };

export interface SessionLanes {
	readonly adopted: (repair: Repair) => ReadonlyArray<AgentEvent>;
	readonly frame: (message: SDKMessage) => ReadonlyArray<AgentEvent>;
	readonly mirror: (write: MirrorWrite) => ReadonlyArray<AgentEvent>;
	readonly recorded: (agentId: string) => boolean;
}

const isProgress = (message: SDKMessage) => message.type === "system" && message.subtype === "task_progress";

export const openSessionLanes = (): SessionLanes => {
	const mapping = openSessionMapping();
	const identities = openWorkflowIdentities();
	const nodes = openWorkflowNodes(identities);
	const results = openWorkflowResults();
	const invokerOrigin = (key: SessionKey): Origin | undefined => {
		const node = subagentRef(key);
		const spawnedBy = node === undefined ? undefined : mapping.spawnerOf(node);
		return node === undefined || spawnedBy === undefined ? undefined : { node, spawnedBy };
	};
	const mirror = ({ entries, key }: MirrorWrite): ReadonlyArray<AgentEvent> => {
		const ref = workflowAgentRef(key);
		if (ref === undefined) {
			return results.recovered(entries, invokerOrigin(key));
		}
		const origin = nodes.originOf(ref);
		return [...nodes.opened(ref), ...entries.flatMap((entry) => transcriptEvents(entry, origin))];
	};
	return {
		adopted: (repair) => [...repair.agents.flatMap(adoptedEvents), ...(repair.failure === undefined ? [] : [censusGap(repair.failure)])],
		frame: (message) => {
			if (!isProgress(message)) {
				return mapping.frame(message);
			}
			identities.observe(message);
			return nodes.settled();
		},
		mirror,
		recorded: (agentId) => nodes.known(agentId) || mapping.spawnerOf(agentId) !== undefined,
	};
};

export const laneEvents = (lanes: SessionLanes, delivery: Delivery): ReadonlyArray<AgentEvent> => {
	if (delivery.kind === "frame") {
		return lanes.frame(delivery.message);
	}
	return delivery.kind === "mirror" ? lanes.mirror(delivery.write) : lanes.adopted(delivery.repair);
};
