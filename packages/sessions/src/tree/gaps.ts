import type {
	AgentEvent,
	RawPayload,
} from "@antumbra/vocabulary/session-events";
import type { TreeNode } from "#tree/attribution.ts";

// why: a gap the host observed has no provider frame behind it, and saying
// otherwise would put words in the provider's mouth. The envelope names
// Antumbra as the source and carries what was actually seen, so a reader can
// still tell which observation the hole came from.
export const observed = (kind: string, seen: unknown): RawPayload => ({
	kind,
	payload: JSON.stringify(seen),
	source: "antumbra",
});

// why: the event that could not be appended is evidence that would otherwise
// vanish with the failed write, so the gap carries it rather than only a count.
export const appendFailedGap = (
	sessionId: string,
	lost: AgentEvent,
): AgentEvent => ({
	detail: `a ${lost.type} event could not be appended`,
	gapKind: "append-failed",
	raw: observed("journal/append-failed", { lost, sessionId }),
	type: "subsession.gap",
});

// why: a node the record admitted from its own frames was already talking
// before anything announced it, so its journal opens earlier than the row that
// names it. Saying so is the difference between a reader dating the work to the
// announcement and reading it for what it was.
export const adoptedLateGap = (
	node: TreeNode,
	announcedAt: number,
): AgentEvent => ({
	detail: `this node was admitted from its own frames ${announcedAt - node.openedAt}ms before anything announced it`,
	gapKind: "adopted-late",
	raw: observed("session/adopted-late", {
		admittedAt: node.openedAt,
		announcedAt,
		subsessionRef: node.subsessionRef,
	}),
	type: "subsession.gap",
});

// why: a node still open when the app starts again lost the stream that fed it
// with the process that held it, and the detach that would have said so never
// ran. That is what this kind means, so it is written plainly rather than left
// to a reader to infer from a row that stops without a word.
export const processGoneGap = (sessionId: string): AgentEvent => ({
	detail:
		"the process holding this node's stream is gone; the detach that would have said so never ran",
	gapKind: "stream-detached",
	raw: observed("session/reconciled", { sessionId }),
	type: "subsession.gap",
});

// why: a node whose detach was already journaled lost something else — nothing
// ever reported how its work ended — and that loss has no name of its own here.
// It takes the escape hatch with a plain detail rather than a second copy of a
// neighbour's word.
export const endingUnreportedGap = (sessionId: string): AgentEvent => ({
	detail:
		"this node was still open at startup with nothing left that could speak for it, and how its work ended was never reported",
	gapKind: "unknown",
	raw: observed("session/reconciled", { sessionId }),
	type: "subsession.gap",
});

export const streamDetachedGap = (
	node: TreeNode,
	detachedAt: number,
): AgentEvent => ({
	detail: `the stream detached ${detachedAt - node.openedAt}ms after this node opened, before it reported an ending`,
	gapKind: "stream-detached",
	raw: observed("session/stream-detached", {
		openedAt: node.openedAt,
		detachedAt,
		subsessionRef: node.subsessionRef,
	}),
	type: "subsession.gap",
});
