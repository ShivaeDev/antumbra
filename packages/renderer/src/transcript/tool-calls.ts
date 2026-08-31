import type { TranscriptItem, TranscriptTool } from "#transcript/model.ts";

export interface ToolCalls {
	readonly complete: (toolId: string, ok: boolean, result: string) => void;
	readonly start: (toolId: string, item: TranscriptTool) => void;
}

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
