import { type SessionTreeNode, subsessionDisplayName } from "@antumbra/contract";
import type { SubsessionEnded, SubsessionOpened } from "@antumbra/vocabulary/session-events.ts";
import type { TranscriptDelegation } from "#transcript/model.ts";

export type NodesByRef = ReadonlyMap<string, SessionTreeNode>;

export const nodesByRef = (nodes: ReadonlyArray<SessionTreeNode>): NodesByRef =>
	new Map(nodes.flatMap((node) => (node.nativeRef === null ? [] : [[node.nativeRef, node] as const])));

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
