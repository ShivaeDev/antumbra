import type { AgentEvent, RawPayload } from "@antumbra/vocabulary/session-events.ts";
import type { TreeNode } from "#tree/attribution.ts";

export const observed = (kind: string, seen: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(seen),
	source: "antumbra",
});

export const appendFailedGap = (sessionId: string, lost: AgentEvent): AgentEvent => ({
	detail: `a ${lost.type} event could not be appended`,
	gapKind: "append-failed",
	raw: observed("journal/append-failed", { lost, sessionId }),
	type: "subsession.gap",
});

export const adoptedLateGap = (node: TreeNode, announcedAt: number): AgentEvent => ({
	detail: `this node was admitted from its own frames ${announcedAt - node.openedAt}ms before anything announced it`,
	gapKind: "adopted-late",
	raw: observed("session/adopted-late", {
		admittedAt: node.openedAt,
		announcedAt,
		subsessionRef: node.subsessionRef,
	}),
	type: "subsession.gap",
});

export const processGoneGap = (sessionId: string): AgentEvent => ({
	detail: "the process holding this node's stream is gone; the detach that would have said so never ran",
	gapKind: "stream-detached",
	raw: observed("session/reconciled", { sessionId }),
	type: "subsession.gap",
});

export const endingUnreportedGap = (sessionId: string): AgentEvent => ({
	detail: "this node was still open at startup with nothing left that could speak for it, and how its work ended was never reported",
	gapKind: "unknown",
	raw: observed("session/reconciled", { sessionId }),
	type: "subsession.gap",
});

export const streamDetachedGap = (node: TreeNode, detachedAt: number): AgentEvent => ({
	detail: `the stream detached ${detachedAt - node.openedAt}ms after this node opened, before it reported an ending`,
	gapKind: "stream-detached",
	raw: observed("session/stream-detached", {
		openedAt: node.openedAt,
		detachedAt,
		subsessionRef: node.subsessionRef,
	}),
	type: "subsession.gap",
});
