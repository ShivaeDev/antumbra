import type { SessionEvent } from "@antumbra/contract";
import { parseJson } from "#adapters/json.ts";
import type { TranscriptItem } from "#transcript/model.ts";
import { blocksOf, telemetryLabel, textOf } from "#transcript/payload.ts";

interface Derivation {
	readonly items: TranscriptItem[];
	readonly toolsById: Map<string, number>;
}

const applyText = (
	state: Derivation,
	event: SessionEvent,
	block: Record<string, unknown>,
): void => {
	if (typeof block.text === "string") {
		state.items.push({
			kind: "message",
			role: event.kind,
			seq: event.seq,
			text: block.text,
		});
	}
};

const applyToolUse = (
	state: Derivation,
	event: SessionEvent,
	block: Record<string, unknown>,
): void => {
	if (typeof block.id !== "string" || typeof block.name !== "string") {
		return;
	}
	state.toolsById.set(block.id, state.items.length);
	state.items.push({
		input: JSON.stringify(block.input),
		kind: "tool",
		name: block.name,
		result: undefined,
		seq: event.seq,
	});
};

const applyToolResult = (
	state: Derivation,
	block: Record<string, unknown>,
): void => {
	if (typeof block.tool_use_id !== "string") {
		return;
	}
	const at = state.toolsById.get(block.tool_use_id);
	const tool = at === undefined ? undefined : state.items[at];
	if (at !== undefined && tool !== undefined && tool.kind === "tool") {
		state.items[at] = { ...tool, result: textOf(block.content) };
	}
};

const applyBlock = (
	state: Derivation,
	event: SessionEvent,
	block: Record<string, unknown>,
): void => {
	if (block.type === "text") {
		applyText(state, event, block);
		return;
	}
	if (block.type === "tool_use") {
		applyToolUse(state, event, block);
		return;
	}
	if (block.type === "tool_result") {
		applyToolResult(state, block);
	}
};

const applyEvent = (state: Derivation, event: SessionEvent): void => {
	const payload = parseJson(event.payload);
	if (event.kind === "assistant" || event.kind === "user") {
		for (const block of blocksOf(payload)) {
			applyBlock(state, event, block);
		}
		return;
	}
	if (event.kind.startsWith("result/") || event.kind.startsWith("system/")) {
		state.items.push({
			kind: "telemetry",
			label: telemetryLabel(event.kind, payload),
			seq: event.seq,
		});
		return;
	}
	state.items.push({
		kind: "raw",
		label: event.kind,
		payload: event.payload,
		seq: event.seq,
	});
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
