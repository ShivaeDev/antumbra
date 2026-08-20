import type { SessionEvent, SessionTreeNode } from "@antumbra/contract";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import {
	endedDelegation,
	type NodesByRef,
	nodesByRef,
	openedDelegation,
} from "#transcript/delegation.ts";
import { gapNotice } from "#transcript/gaps.ts";
import { openedLabel, turnLabel, usageLabel } from "#transcript/labels.ts";
import type {
	TranscriptItem,
	TranscriptMessage,
	TranscriptThinking,
} from "#transcript/model.ts";
import { openToolCalls, type ToolCalls } from "#transcript/tool-calls.ts";

interface Derivation {
	readonly items: TranscriptItem[];
	readonly nodes: NodesByRef;
	readonly tools: ToolCalls;
}

// why: a wordless thinking block is an event, not narration — providers emit
// them by the hundred. Kept, it renders as a blank block that still spends the
// transcript's spacing, opening a gap with nothing in it to explain the gap.
const pushNarration = (
	state: Derivation,
	item: TranscriptMessage | TranscriptThinking,
): void => {
	if (item.text !== "") {
		state.items.push(item);
	}
};

const pushTelemetry = (state: Derivation, label: string, seq: number): void => {
	state.items.push({ kind: "telemetry", label, seq });
};

// why: the transcript is a pure derivation of a Known neutral event. Provider
// RawEvent stays visually raw and every other variant is handled exhaustively.
const applyKnownEvent = (
	state: Derivation,
	event: AgentEvent,
	seq: number,
): void => {
	switch (event.type) {
		case "message":
			pushNarration(state, {
				kind: "message",
				role: event.role,
				seq,
				text: event.text.trim(),
			});
			return;
		case "thinking":
			pushNarration(state, {
				kind: "thinking",
				seq,
				text: event.text.trim(),
			});
			return;
		case "tool.started":
			state.tools.start(event.toolId, {
				input: event.input,
				kind: "tool",
				name: event.name,
				ok: undefined,
				result: undefined,
				seq,
			});
			return;
		case "tool.completed":
			state.tools.complete(event.toolId, event.ok, event.output);
			return;
		case "usage":
			pushTelemetry(state, usageLabel(event), seq);
			return;
		case "turn.completed":
			pushTelemetry(state, turnLabel(event), seq);
			return;
		case "session.opened":
			pushTelemetry(state, openedLabel(event), seq);
			return;
		case "subsession.opened":
			state.items.push(openedDelegation(state.nodes, event, seq));
			return;
		case "subsession.ended":
			state.items.push(endedDelegation(state.nodes, event, seq));
			return;
		case "subsession.gap":
			state.items.push(gapNotice(event, seq));
			return;
		case "raw":
			state.items.push({
				kind: "raw",
				label: `${event.raw.source} ${event.raw.kind}`,
				payload: event.raw.payload,
				seq,
			});
			return;
	}
	event satisfies never;
};

// why: the domain already made historical uncertainty explicit. The renderer
// exhausts that envelope and never reparses bytes or invents a known event.
const applyEvent = (state: Derivation, row: SessionEvent): void => {
	switch (row.event._tag) {
		case "Known":
			applyKnownEvent(state, row.event.event, row.seq);
			return;
		case "Unknown":
			state.items.push({
				kind: "raw",
				label: row.event.kind,
				payload: row.event.payload,
				seq: row.seq,
			});
			return;
	}
	row.event satisfies never;
};

// why: the tree is walked at read time and handed in, because depth and a
// node's name are facts about the record rather than about any one frame. A
// caller with no tree — a detached transcript, a fixture — still derives every
// item; delegation markers simply have nowhere to point.
export const deriveTranscript = (
	events: ReadonlyArray<SessionEvent>,
	nodes: ReadonlyArray<SessionTreeNode> = [],
): ReadonlyArray<TranscriptItem> => {
	const items: TranscriptItem[] = [];
	const state: Derivation = {
		items,
		nodes: nodesByRef(nodes),
		tools: openToolCalls(items),
	};
	for (const event of events) {
		applyEvent(state, event);
	}
	return state.items;
};
