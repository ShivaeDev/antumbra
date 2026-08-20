import type {
	SDKMessage,
	SessionKey,
	SessionStoreEntry,
} from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, Origin } from "@antumbra/vocabulary/session-events";
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

// why: this provider says what a Session did on more than one lane, and they
// arrive as one ordered delivery so the record has one order. A frame is what
// the stream forwarded, a mirror write is a transcript the provider stored, and
// a repair is what a census found after the stream fell silent.
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

const isProgress = (message: SDKMessage) =>
	message.type === "system" && message.subtype === "task_progress";

// why: this provider says what a Session did on two lanes. The stream carries
// the session's own turns and the agents it delegates through a tool call; the
// mirrored transcript is the only place a workflow's agents appear at all. Both
// land in one ordered stream of neutral events so the record has one writer,
// one journal path, and one tree — never a second acquisition machine running
// beside the first.
export const openSessionLanes = (): SessionLanes => {
	const mapping = openSessionMapping();
	const identities = openWorkflowIdentities();
	const nodes = openWorkflowNodes(identities);
	const results = openWorkflowResults();
	// why: a mirrored write of a transcript the stream already carried is read
	// only for what the stream drops. Attribution comes from the key: a node's
	// own file belongs to that node, and the main transcript to the root.
	const invokerOrigin = (key: SessionKey): Origin | undefined => {
		const node = subagentRef(key);
		const spawnedBy = node === undefined ? undefined : mapping.spawnerOf(node);
		return node === undefined || spawnedBy === undefined
			? undefined
			: { node, spawnedBy };
	};
	const mirror = ({ entries, key }: MirrorWrite): ReadonlyArray<AgentEvent> => {
		const ref = workflowAgentRef(key);
		if (ref === undefined) {
			return results.recovered(entries, invokerOrigin(key));
		}
		const origin = nodes.originOf(ref);
		return [
			...nodes.opened(ref),
			...entries.flatMap((entry) => transcriptEvents(entry, origin)),
		];
	};
	return {
		adopted: (repair) => [
			...repair.agents.flatMap(adoptedEvents),
			...(repair.failure === undefined ? [] : [censusGap(repair.failure)]),
		],
		frame: (message) => {
			if (!isProgress(message)) {
				return mapping.frame(message);
			}
			identities.observe(message);
			return nodes.settled();
		},
		mirror,
		recorded: (agentId) =>
			nodes.known(agentId) || mapping.spawnerOf(agentId) !== undefined,
	};
};

// why: one dispatch for every lane, so the live adapter and a scripted
// rehearsal put the provider's words through the same reading of them.
export const laneEvents = (
	lanes: SessionLanes,
	delivery: Delivery,
): ReadonlyArray<AgentEvent> => {
	if (delivery.kind === "frame") {
		return lanes.frame(delivery.message);
	}
	return delivery.kind === "mirror"
		? lanes.mirror(delivery.write)
		: lanes.adopted(delivery.repair);
};
