import { Option } from "effect";

export type BoardRegister = "rough" | "smooth";

// why: `seq` is the board's own order, claimed by the append that wrote the
// row. It exists because `createdAt` is stored to the second and ties whenever
// two hands write inside the same one, which would make a log's order a toss.
export interface BoardEntryRow {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly register: string;
	readonly seq: number;
}

export interface EntryInput {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly register: BoardRegister;
}

export interface AppendFields {
	readonly nowMillis: number;
	readonly seq: number;
}

// why: the stored row carries the board it hangs off, which a reader of one
// board already knows; projecting here keeps that column from leaking into
// every view that only wanted the entry.
export const entryRow = (row: BoardEntryRow): BoardEntryRow => ({
	authorAgentId: row.authorAgentId,
	body: row.body,
	createdAt: row.createdAt,
	id: row.id,
	register: row.register,
	seq: row.seq,
});

export const smoothBodies = (
	entries: ReadonlyArray<BoardEntryRow>,
): ReadonlyArray<string> =>
	entries
		.filter((entry) => entry.register === "smooth")
		.map((entry) => entry.body);

export const nextSequence = (last: Option.Option<{ readonly seq: number }>) =>
	Option.match(last, {
		onNone: () => 1,
		onSome: (entry) => entry.seq + 1,
	});

export const appendedEntry = (
	input: EntryInput,
	fields: AppendFields,
): BoardEntryRow => ({
	authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
	body: input.body,
	createdAt: new Date(fields.nowMillis),
	id: crypto.randomUUID(),
	register: input.register,
	seq: fields.seq,
});
