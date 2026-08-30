import { type SessionTreeNode, subsessionDisplayName } from "@antumbra/contract";
import type { SubsessionEnded, SubsessionOpened } from "@antumbra/vocabulary/session-events";
import type { TranscriptDelegation } from "#transcript/model.ts";

export type NodesByRef = ReadonlyMap<string, SessionTreeNode>;

// why: a marker names the provider's reference for the conversation, and the
// tree read carries the same reference on the row it minted — so the join
// between what a transcript says and which node it points at is that reference
// and never a position or a guess.
export const nodesByRef = (nodes: ReadonlyArray<SessionTreeNode>): NodesByRef =>
	new Map(nodes.flatMap((node) => (node.nativeRef === null ? [] : [[node.nativeRef, node] as const])));

// why: the tree read already applied the display rule to what was stored, so a
// marker the tree can place wears exactly the name the tree shows. One the
// tree cannot place runs the same rule over what the frame itself said, so the
// two can never end up calling one node two things.
const nameOf = (
	nodes: NodesByRef,
	subsessionRef: string,
	said: {
		readonly kind?: string | undefined;
		readonly label?: string | undefined;
	},
): string => nodes.get(subsessionRef)?.displayName ?? subsessionDisplayName({ kind: said.kind ?? null, label: said.label ?? null });

export const openedDelegation = (nodes: NodesByRef, event: typeof SubsessionOpened.Type, seq: number): TranscriptDelegation => ({
	displayName: nameOf(nodes, event.subsessionRef, event),
	kind: "delegation",
	nodeId: nodes.get(event.subsessionRef)?.id,
	outcome: undefined,
	seq,
	state: "opened",
});

export const endedDelegation = (nodes: NodesByRef, event: typeof SubsessionEnded.Type, seq: number): TranscriptDelegation => ({
	displayName: nameOf(nodes, event.subsessionRef, {}),
	kind: "delegation",
	nodeId: nodes.get(event.subsessionRef)?.id,
	outcome: event.outcome,
	seq,
	state: "ended",
});
