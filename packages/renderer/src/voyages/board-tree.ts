import type { BoardEntryView, BoardSummaryView } from "@antumbra/contract";

export interface BoardNode {
	readonly children: ReadonlyArray<BoardNode>;
	readonly entry: BoardEntryView;
}

const isSummary = (entry: BoardEntryView): entry is BoardSummaryView => entry.kind === "summary";

const coverable = (entry: BoardEntryView): boolean => entry.register === "rough" || isSummary(entry);

const covers = (summary: BoardSummaryView, entry: BoardEntryView): boolean =>
	entry.id !== summary.id && entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo;

const span = (summary: BoardSummaryView): number => summary.coversTo - summary.coversFrom;

const coveringSummary = (summaries: ReadonlyArray<BoardSummaryView>, entry: BoardEntryView): BoardSummaryView | undefined =>
	coverable(entry) ? summaries.filter((summary) => covers(summary, entry)).sort((left, right) => span(left) - span(right))[0] : undefined;

const standsAt = (entry: BoardEntryView): number => (isSummary(entry) ? entry.coversTo : entry.seq);

export const boardTree = (entries: ReadonlyArray<BoardEntryView>): ReadonlyArray<BoardNode> => {
	const summaries = entries.filter(isSummary);
	const covered = new Map<string, ReadonlyArray<BoardEntryView>>();
	const loose: Array<BoardEntryView> = [];
	for (const entry of entries) {
		const summary = coveringSummary(summaries, entry);
		if (summary === undefined) {
			loose.push(entry);
		} else {
			covered.set(summary.id, [...(covered.get(summary.id) ?? []), entry]);
		}
	}
	const nodesOf = (of: ReadonlyArray<BoardEntryView>): ReadonlyArray<BoardNode> =>
		of
			.map((entry) => ({ children: nodesOf(covered.get(entry.id) ?? []), entry }))
			.sort((left, right) => standsAt(right.entry) - standsAt(left.entry));
	return nodesOf(loose);
};

export const coveredSummaries = (nodes: ReadonlyArray<BoardNode>): ReadonlyArray<BoardSummaryView> =>
	nodes.map((node) => node.entry).filter(isSummary);

export const coveredEntryCount = (nodes: ReadonlyArray<BoardNode>): number =>
	nodes.reduce((total, node) => total + (isSummary(node.entry) ? coveredEntryCount(node.children) : 1), 0);
