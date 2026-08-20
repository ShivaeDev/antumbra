import type { TranscriptItem, TranscriptTool } from "#transcript/model.ts";

export interface ToolCalls {
	readonly complete: (toolId: string, ok: boolean, result: string) => void;
	readonly start: (toolId: string, item: TranscriptTool) => void;
}

// why: a call and its result are two events with narration in between, so the
// item the call opened is remembered by position and finished where it stands.
// Appending the result instead would tear the two halves of one call apart and
// leave every call reading as still running.
export const openToolCalls = (items: TranscriptItem[]): ToolCalls => {
	const at = new Map<string, number>();
	return {
		complete: (toolId, ok, result) => {
			const index = at.get(toolId);
			const item = index === undefined ? undefined : items[index];
			if (index !== undefined && item !== undefined && item.kind === "tool") {
				items[index] = { ...item, ok, result };
			}
		},
		start: (toolId, item) => {
			at.set(toolId, items.length);
			items.push(item);
		},
	};
};
