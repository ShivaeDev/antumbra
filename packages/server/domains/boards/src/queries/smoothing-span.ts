import { Schema } from "effect";
import { covered, type Entry, inOrder } from "#queries/covered.ts";
import { boardEntry } from "#rows/board-entry.ts";

export const Span = Schema.Struct({ coversFrom: Schema.Number, coversTo: Schema.Number, entries: Schema.Array(boardEntry.Row) });
export type Span = typeof Span.Type;
export const Day = Schema.Struct({ ...Span.fields, day: Schema.String });

const pad = (value: number): string => String(value).padStart(2, "0");
export const localDay = (at: Date): string => `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;

export const uncovered = (entries: readonly Entry[]) => inOrder(entries).filter((entry) => entry.register === "rough" && !covered(entries, entry));

export const span = (entries: readonly Entry[]): Span | undefined => {
	const notes = uncovered(entries);
	const first = notes[0];
	const last = notes.at(-1);
	return first === undefined || last === undefined ? undefined : { coversFrom: first.seq, coversTo: last.seq, entries: notes };
};

export const days = (entries: readonly Entry[]): readonly (typeof Day.Type)[] => {
	const grouped = new Map<string, typeof Day.Type>();
	for (const entry of uncovered(entries)) {
		const day = localDay(new Date(entry.createdAt));
		const current = grouped.get(day);
		grouped.set(
			day,
			current === undefined
				? { day, coversFrom: entry.seq, coversTo: entry.seq, entries: [entry] }
				: { ...current, coversTo: entry.seq, entries: [...current.entries, entry] },
		);
	}
	return [...grouped.values()];
};
