import { Effect, Option, Schema } from "effect";
import { StoredBoardEntryInvalid } from "#errors.ts";

export type BoardRegister = "rough" | "smooth";

export type MailPrecedence = "flash" | "priority" | "routine";

// why: `seq` is the board's own order, claimed by the append that wrote the
// row. It exists because `createdAt` is stored to the second and ties whenever
// two hands write inside the same one, which would make a log's order a toss.
interface BoardEntryFields {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly createdAt: Date;
	readonly id: string;
	readonly register: BoardRegister;
	readonly seq: number;
	readonly sourceRef: string | null;
}

export type BoardEntryRow = BoardEntryFields &
	(
		| {
				readonly kind: "mail";
				readonly precedence: MailPrecedence;
				readonly sourceRef: string;
		  }
		| {
				readonly kind: "note";
				readonly precedence: "routine";
		  }
	);

interface EntryFields {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly register: BoardRegister;
}

export type EntryInput = EntryFields &
	(
		| {
				readonly kind: "mail";
				readonly precedence: MailPrecedence;
				readonly sourceRef: string;
		  }
		| {
				readonly kind?: "note";
				readonly precedence?: "routine";
				readonly sourceRef?: string;
		  }
	);

export interface AppendFields {
	readonly nowMillis: number;
	readonly seq: number;
}

// why: this is the disk boundary. Unknown entry vocabulary is corruption, not
// a quiet note or routine precedence, so decoding fails before any projection
// can make the row look benign; the Board id is omitted because its reader
// already knows it.
const StoredFields = {
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.Date,
	id: Schema.String,
	register: Schema.Literals(["rough", "smooth"]),
	seq: Schema.Number,
};

const StoredBoardEntry = Schema.Union([
	Schema.Struct({
		...StoredFields,
		kind: Schema.Literals(["mail"]),
		precedence: Schema.Literals(["flash", "priority", "routine"]),
		sourceRef: Schema.String,
	}),
	Schema.Struct({
		...StoredFields,
		kind: Schema.Literals(["note"]),
		precedence: Schema.Literals(["routine"]),
		sourceRef: Schema.NullOr(Schema.String),
	}),
]);

export const entryRow = (row: unknown) =>
	Schema.decodeUnknownEffect(StoredBoardEntry)(row).pipe(
		Effect.mapError(
			(cause) =>
				new StoredBoardEntryInvalid({
					detail: String(cause),
					entryId:
						typeof row === "object" &&
						row !== null &&
						"id" in row &&
						typeof row.id === "string"
							? row.id
							: "unknown",
				}),
		),
	);

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
): BoardEntryRow => {
	const row = {
		authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
		body: input.body,
		createdAt: new Date(fields.nowMillis),
		id: crypto.randomUUID(),
		register: input.register,
		seq: fields.seq,
	};
	return input.kind === "mail"
		? {
				...row,
				kind: "mail",
				precedence: input.precedence,
				sourceRef: input.sourceRef,
			}
		: {
				...row,
				kind: "note",
				precedence: "routine",
				sourceRef: input.sourceRef ?? null,
			};
};
