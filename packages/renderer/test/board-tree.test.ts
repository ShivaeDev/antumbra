import type { BoardEntryView, SummaryLevel } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { type BoardNode, boardTree, coveredEntryCount, coveredSummaries } from "#voyages/board-tree.ts";
import { summaryCoveredLabel, summaryHeadingLabel } from "#voyages/labels.ts";

const at = (day: number): string => `2026-08-${String(day).padStart(2, "0")}T09:10:00.000Z`;

const rough = (seq: number, day: number): BoardEntryView => ({
	authorAgentId: "agent-1",
	body: `sounding ${seq}`,
	createdAt: at(day),
	id: `rough-${seq}`,
	kind: "note",
	register: "rough",
	seq,
});

const admiralNote = (seq: number, day: number): BoardEntryView => ({
	authorAgentId: null,
	body: `standing order ${seq}`,
	createdAt: at(day),
	id: `note-${seq}`,
	kind: "note",
	register: "smooth",
	seq,
});

const summary = (seq: number, day: number, level: SummaryLevel, coversFrom: number, coversTo: number): BoardEntryView => ({
	authorAgentId: "agent-9",
	body: `what happened ${seq}`,
	coversFrom,
	coversTo,
	createdAt: at(day),
	id: `summary-${seq}`,
	kind: "summary",
	level,
	register: "smooth",
	seq,
});

const ids = (nodes: ReadonlyArray<BoardNode>): ReadonlyArray<string> => nodes.map((node) => node.entry.id);

const under = (nodes: ReadonlyArray<BoardNode>, index: number): ReadonlyArray<BoardNode> => nodes[index]?.children ?? [];

const heading = (nodes: ReadonlyArray<BoardNode>, index: number, boardName: string): string => {
	const node = nodes[index];
	return node === undefined || node.entry.kind !== "summary" ? "no summary there" : summaryHeadingLabel(node.entry, node.children, boardName);
};

const twoDays: ReadonlyArray<BoardEntryView> = [
	rough(1, 14),
	rough(2, 14),
	summary(3, 15, "day", 1, 2),
	rough(4, 15),
	rough(5, 15),
	summary(6, 16, "day", 4, 5),
	rough(7, 16),
];

describe("boardTree", () => {
	it("keeps the uncovered tail on top and stands each summary at the end of the range it covers", () => {
		expect(ids(boardTree(twoDays))).toEqual(["rough-7", "summary-6", "summary-3"]);
	});

	it("shows a covered entry only behind the summary that covers it", () => {
		const shown = boardTree(twoDays);
		expect(ids(under(shown, 1))).toEqual(["rough-5", "rough-4"]);
		expect(ids(under(shown, 2))).toEqual(["rough-2", "rough-1"]);
	});

	it("shows the highest summary that covers a span and folds the lower ones behind it", () => {
		const nested = boardTree([...twoDays, summary(8, 16, "piece", 1, 6)]);

		expect(ids(nested)).toEqual(["rough-7", "summary-8"]);
		expect(ids(under(nested, 1))).toEqual(["summary-6", "summary-3"]);
	});

	it("leaves the admiral's own smooth entry in the log rather than behind a summary", () => {
		const written = boardTree([rough(1, 14), admiralNote(2, 14), rough(3, 14), summary(4, 15, "day", 1, 3)]);

		expect(ids(written)).toEqual(["summary-4", "note-2"]);
		expect(ids(under(written, 0))).toEqual(["rough-3", "rough-1"]);
	});
});

describe("summary labels", () => {
	it("counts the rough entries a summary stands for", () => {
		expect(summaryCoveredLabel(under(boardTree(twoDays), 1))).toBe("2 entries");
	});

	it("counts the summaries a summary stands for beside every entry beneath them", () => {
		const nested = boardTree([...twoDays, summary(8, 16, "piece", 1, 6)]);
		expect(summaryCoveredLabel(under(nested, 1))).toBe("2 days · 4 entries");
	});

	it("says entry and day in the singular when one is all there is", () => {
		const one = boardTree([rough(1, 14), summary(2, 15, "day", 1, 1), summary(3, 16, "piece", 1, 2)]);
		expect(summaryCoveredLabel(under(one, 0))).toBe("1 day · 1 entry");
	});

	it("dates a day summary by the entries behind it, not by when it was written", () => {
		expect(heading(boardTree(twoDays), 1, "Chart the reef")).toBe("Day summary · 2026-08-15");
	});

	it("names the Piece a Piece summary stands for", () => {
		expect(heading(boardTree([...twoDays, summary(8, 16, "piece", 1, 6)]), 1, "soundings")).toBe("Piece summary · soundings");
	});
});

describe("covered counts", () => {
	it("counts only the entries, however deep the summaries run", () => {
		const covered = under(boardTree([...twoDays, summary(8, 16, "piece", 1, 6)]), 1);

		expect(coveredEntryCount(covered)).toBe(4);
		expect(coveredSummaries(covered).map((each) => each.level)).toEqual(["day", "day"]);
	});
});
