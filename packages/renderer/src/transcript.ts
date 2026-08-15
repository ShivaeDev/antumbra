import type { SessionEvent } from "@antumbra/contract";
import { parseJson } from "#adapters/json.ts";

export interface TranscriptMessage {
	readonly kind: "message";
	readonly role: string;
	readonly seq: number;
	readonly text: string;
}
export interface TranscriptTool {
	readonly input: string;
	readonly kind: "tool";
	readonly name: string;
	readonly result: string | undefined;
	readonly seq: number;
}
export interface TranscriptTelemetry {
	readonly kind: "telemetry";
	readonly label: string;
	readonly seq: number;
}
export interface TranscriptRaw {
	readonly kind: "raw";
	readonly label: string;
	readonly payload: string;
	readonly seq: number;
}
export type TranscriptItem =
	| TranscriptMessage
	| TranscriptRaw
	| TranscriptTelemetry
	| TranscriptTool;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const blocksOf = (payload: unknown): ReadonlyArray<Record<string, unknown>> => {
	if (!isRecord(payload) || !isRecord(payload.message)) {
		return [];
	}
	const content = payload.message.content;
	if (typeof content === "string") {
		return [{ text: content, type: "text" }];
	}
	return Array.isArray(content) ? content.filter(isRecord) : [];
};

const textOf = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.filter(isRecord)
			.map((block) => (typeof block.text === "string" ? block.text : ""))
			.join("");
	}
	return JSON.stringify(content);
};

const telemetryLabel = (kind: string, payload: unknown): string => {
	if (!isRecord(payload)) {
		return kind;
	}
	const parts = [kind];
	if (typeof payload.model === "string") {
		parts.push(payload.model);
	}
	if (typeof payload.duration_ms === "number") {
		parts.push(`${(payload.duration_ms / 1000).toFixed(1)}s`);
	}
	if (typeof payload.total_cost_usd === "number") {
		parts.push(`$${payload.total_cost_usd.toFixed(4)}`);
	}
	return parts.join(" · ");
};

export const deriveTranscript = (
	events: ReadonlyArray<SessionEvent>,
): ReadonlyArray<TranscriptItem> => {
	const items: TranscriptItem[] = [];
	const toolsById = new Map<string, number>();
	for (const event of events) {
		const payload = parseJson(event.payload);
		if (event.kind === "assistant" || event.kind === "user") {
			for (const block of blocksOf(payload)) {
				if (block.type === "text" && typeof block.text === "string") {
					items.push({
						kind: "message",
						role: event.kind,
						seq: event.seq,
						text: block.text,
					});
				} else if (
					block.type === "tool_use" &&
					typeof block.id === "string" &&
					typeof block.name === "string"
				) {
					toolsById.set(block.id, items.length);
					items.push({
						input: JSON.stringify(block.input),
						kind: "tool",
						name: block.name,
						result: undefined,
						seq: event.seq,
					});
				} else if (
					block.type === "tool_result" &&
					typeof block.tool_use_id === "string"
				) {
					const at = toolsById.get(block.tool_use_id);
					const tool = at === undefined ? undefined : items[at];
					if (at !== undefined && tool !== undefined && tool.kind === "tool") {
						items[at] = { ...tool, result: textOf(block.content) };
					}
				}
			}
		} else if (
			event.kind.startsWith("result/") ||
			event.kind.startsWith("system/")
		) {
			items.push({
				kind: "telemetry",
				label: telemetryLabel(event.kind, payload),
				seq: event.seq,
			});
		} else {
			items.push({
				kind: "raw",
				label: event.kind,
				payload: event.payload,
				seq: event.seq,
			});
		}
	}
	return items;
};
