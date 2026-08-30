import { BoardRegisterSchema } from "@antumbra/vocabulary/board";
import { Effect, Option, Schema } from "effect";
import { StoredBoardEntryInvalid } from "#errors.ts";
import { type AppendFields, type BoardEntryRow, type BoardEntryVariant, EntryInput } from "#model.ts";

// why: this is the disk boundary. Unknown entry vocabulary is corruption, not
// a quiet note or routine precedence, so decoding fails before projection.
const StoredFields = {
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.Date,
	id: Schema.String,
	register: BoardRegisterSchema,
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
					entryId: typeof row === "object" && row !== null && "id" in row && typeof row.id === "string" ? row.id : "unknown",
				}),
		),
	);

export const smoothBodies = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<string> =>
	entries.filter((entry) => entry.register === "smooth").map((entry) => entry.body);

export const nextSequence = (last: Option.Option<{ readonly seq: number }>) =>
	Option.match(last, {
		onNone: () => 1,
		onSome: (entry) => entry.seq + 1,
	});

export const storedEntryVariant = (input: EntryInput): BoardEntryVariant =>
	EntryInput.$match(input, {
		Mail: ({ precedence, sourceRef }): BoardEntryVariant => ({
			kind: "mail",
			precedence,
			sourceRef,
		}),
		Note: ({ sourceRef }): BoardEntryVariant => ({
			kind: "note",
			precedence: "routine",
			sourceRef: sourceRef ?? null,
		}),
	});

export const appendedEntry = (input: EntryInput, fields: AppendFields): BoardEntryRow => {
	const row = {
		authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
		body: input.body,
		createdAt: new Date(fields.nowMillis),
		id: crypto.randomUUID(),
		register: input.register,
		seq: fields.seq,
	};
	return { ...row, ...storedEntryVariant(input) };
};
