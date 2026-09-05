import type { BoardEntryRow, SummaryRow } from "#model.ts";

export interface SmoothingDay {
	readonly coversFrom: number;
	readonly coversTo: number;
	readonly day: string;
	readonly entries: ReadonlyArray<BoardEntryRow>;
}

const isSummary = (entry: BoardEntryRow): entry is SummaryRow => entry.kind === "summary";

const isCovered = (summaries: ReadonlyArray<SummaryRow>, entry: BoardEntryRow): boolean =>
	entry.register === "rough" && summaries.some((summary) => entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo);

const newestFirst = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<BoardEntryRow> => [...entries].sort((left, right) => right.seq - left.seq);

const pad = (value: number): string => String(value).padStart(2, "0");

const localDay = (at: Date): string => `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

export const uncoveredEntries = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<BoardEntryRow> => {
	const summaries = entries.filter(isSummary);
	return entries.filter((entry) => entry.register === "rough" && !isCovered(summaries, entry));
};

export const uncoveredDays = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<SmoothingDay> => {
	const days = new Map<string, SmoothingDay>();
	for (const entry of uncoveredEntries(entries)) {
		const day = localDay(entry.createdAt);
		const started = days.get(day);
		days.set(
			day,
			started === undefined
				? { coversFrom: entry.seq, coversTo: entry.seq, day, entries: [entry] }
				: { ...started, coversTo: entry.seq, entries: [...started.entries, entry] },
		);
	}
	return [...days.values()];
};

export const digestOf = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<BoardEntryRow> => {
	const summaries = entries.filter(isSummary);
	return newestFirst(entries.filter((entry) => !isCovered(summaries, entry)));
};

export const entriesUnder = (entries: ReadonlyArray<BoardEntryRow>, summaryId: string): ReadonlyArray<BoardEntryRow> => {
	const summary = entries.filter(isSummary).find((candidate) => candidate.id === summaryId);
	return summary === undefined
		? []
		: newestFirst(entries.filter((entry) => entry.register === "rough" && entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo));
};
