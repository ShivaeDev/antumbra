import type { SessionEvent } from "@antumbra/contract";
import { AgentEvent } from "@antumbra/session-events";
import { Option, Schema } from "effect";
import { parseJson } from "#adapters/json.ts";
import { openedLabel, turnLabel, usageLabel } from "#transcript/labels.ts";
import type { TranscriptItem } from "#transcript/model.ts";

interface Derivation {
	readonly items: TranscriptItem[];
	readonly toolsById: Map<string, number>;
}

const decodeEvent = Schema.decodeUnknownOption(AgentEvent);

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

// why: the transcript is a pure derivation of the neutral event vocabulary
// — it never sees a provider's wire shape. Anything the vocabulary calls raw
// (or anything that fails to decode) renders raw: never dropped, never fatal.
const applyEvent = (state: Derivation, row: SessionEvent): void => {
	const decoded = decodeEvent(parseJson(row.payload));
	if (Option.isNone(decoded)) {
		state.items.push({
			kind: "raw",
			label: row.kind,
			payload: row.payload,
			seq: row.seq,
		});
		return;
	}
	const event = decoded.value;
	const seq = row.seq;
	switch (event.type) {
		case "message":
			state.items.push({
				kind: "message",
				role: event.role,
				seq,
				text: event.text,
			});
			return;
		case "thinking":
			state.items.push({ kind: "thinking", seq, text: event.text });
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
			state.items.push({ kind: "telemetry", label: usageLabel(event), seq });
			return;
		case "turn.completed":
			state.items.push({ kind: "telemetry", label: turnLabel(event), seq });
			return;
		case "session.opened":
			state.items.push({ kind: "telemetry", label: openedLabel(event), seq });
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
