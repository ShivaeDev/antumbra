import type { RowValue } from "@antumbra/platform-feature/row.ts";
import type { boardEntry } from "#rows/board-entry.ts";

export type Entry = RowValue<typeof boardEntry>;

export const inOrder = (entries: readonly Entry[]): readonly Entry[] => entries.toSorted((left, right) => left.seq - right.seq);

export const newestFirst = (entries: readonly Entry[]): readonly Entry[] => entries.toSorted((left, right) => right.seq - left.seq);

const spans = (entries: readonly Entry[], entry: Entry): boolean => {
	for (const summary of entries) {
		if (summary.kind === "summary" && summary.coversFrom !== null && summary.coversTo !== null) {
			if (entry.seq >= summary.coversFrom && entry.seq <= summary.coversTo) {
				return true;
			}
		}
	}
	return false;
};

export const covered = (entries: readonly Entry[], entry: Entry): boolean => entry.register === "rough" && spans(entries, entry);

export const summaryOf = (entries: readonly Entry[], summaryId: string): Entry | undefined => {
	for (const entry of entries) {
		if (entry.kind === "summary" && entry.id === summaryId) {
			return entry;
		}
	}
	return undefined;
};
