import type {
	TranscriptItem,
	TranscriptThinking,
	TranscriptTool,
} from "#transcript/model.ts";

export type ToolRunEntry = TranscriptThinking | TranscriptTool;

export interface TranscriptToolRun {
	readonly entries: ReadonlyArray<ToolRunEntry>;
	readonly kind: "toolRun";
	readonly seq: number;
}

export type FoldedItem = TranscriptItem | TranscriptToolRun;

const isEntry = (item: TranscriptItem): item is ToolRunEntry =>
	item.kind === "tool" || item.kind === "thinking";

const calls = (entries: ReadonlyArray<ToolRunEntry>): number =>
	entries.filter((entry) => entry.kind === "tool").length;

// why: a run is what the agent did between two things it said. It ends at the
// last call that has come back: a call still out is the live edge of the
// transcript and stays on its own line, so folding never hides what is
// happening now, and it joins the run once it settles. Thinking between calls
// is the agent talking itself through them and folds with them — a run broken
// by every thought would leave nothing to fold on a provider that thinks
// before each call.
const runFrom = (
	items: ReadonlyArray<TranscriptItem>,
	start: number,
): ReadonlyArray<ToolRunEntry> => {
	const span: ToolRunEntry[] = [];
	let settled = 0;
	for (let at = start; at < items.length; at += 1) {
		const item = items[at];
		if (item === undefined || !isEntry(item)) {
			break;
		}
		span.push(item);
		if (item.kind === "tool" && item.result !== undefined) {
			settled = span.length;
		}
	}
	return span.slice(0, settled);
};

export const foldToolRuns = (
	items: ReadonlyArray<TranscriptItem>,
): ReadonlyArray<FoldedItem> => {
	const folded: FoldedItem[] = [];
	let at = 0;
	while (at < items.length) {
		const item = items[at];
		if (item === undefined) {
			break;
		}
		const run = item.kind === "tool" ? runFrom(items, at) : [];
		if (calls(run) < 2) {
			folded.push(item);
			at += 1;
			continue;
		}
		folded.push({ entries: run, kind: "toolRun", seq: item.seq });
		at += run.length;
	}
	return folded;
};
