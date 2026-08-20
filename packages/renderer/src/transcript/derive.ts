import type { SessionEvent } from "@antumbra/contract";
import type { AgentEvent } from "@antumbra/vocabulary/session-events";
import {
	openedLabel,
	subsessionEndedLabel,
	subsessionGapLabel,
	subsessionOpenedLabel,
	turnLabel,
	usageLabel,
} from "#transcript/labels.ts";
import type {
	TranscriptItem,
	TranscriptMessage,
	TranscriptThinking,
} from "#transcript/model.ts";

interface Derivation {
	readonly items: TranscriptItem[];
	readonly toolsById: Map<string, number>;
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

const completeTool = (
	state: Derivation,
	toolId: string,
	ok: boolean,
	result: string,
): void => {
	const at = state.toolsById.get(toolId);
	const tool = at === undefined ? undefined : state.items[at];
	if (at !== undefined && tool !== undefined && tool.kind === "tool") {
		state.items[at] = { ...tool, ok, result };
	}
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
			state.toolsById.set(event.toolId, state.items.length);
			state.items.push({
				input: event.input,
				kind: "tool",
				name: event.name,
				ok: undefined,
				result: undefined,
				seq,
			});
			return;
		case "tool.completed":
			completeTool(state, event.toolId, event.ok, event.output);
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
			pushTelemetry(state, subsessionOpenedLabel(event), seq);
			return;
		case "subsession.ended":
			pushTelemetry(state, subsessionEndedLabel(event), seq);
			return;
		case "subsession.gap":
			pushTelemetry(state, subsessionGapLabel(event), seq);
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

export const deriveTranscript = (
	events: ReadonlyArray<SessionEvent>,
): ReadonlyArray<TranscriptItem> => {
	const state: Derivation = { items: [], toolsById: new Map() };
	for (const event of events) {
		applyEvent(state, event);
	}
	return state.items;
};
