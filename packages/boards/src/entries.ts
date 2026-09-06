import { BoardRegisterSchema, SummaryLevelSchema } from "@antumbra/vocabulary/board";
import { Effect, Option, Schema } from "effect";
import { StoredBoardEntryInvalid } from "#errors.ts";
import { type AppendFields, type BoardEntryRow, type BoardEntryVariant, EntryInput } from "#model.ts";

const StoredFields = {
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.Date,
	id: Schema.String,
	register: BoardRegisterSchema,
	seq: Schema.Number,
};

const Unsummarized = {
	coversFrom: Schema.Null,
	coversTo: Schema.Null,
	level: Schema.Null,
};

const StoredBoardEntry = Schema.Union([
	Schema.Struct({
		...StoredFields,
		...Unsummarized,
		kind: Schema.Literals(["mail"]),
		precedence: Schema.Literals(["flash", "priority", "routine"]),
		sourceRef: Schema.String,
	}),
	Schema.Struct({
		...StoredFields,
		...Unsummarized,
		kind: Schema.Literals(["note"]),
		precedence: Schema.Literals(["routine"]),
		sourceRef: Schema.NullOr(Schema.String),
	}),
	Schema.Struct({
		...StoredFields,
		...Unsummarized,
		kind: Schema.Literals(["pieceSummary"]),
		precedence: Schema.Literals(["routine"]),
		sourceRef: Schema.String,
	}),
	Schema.Struct({
		...StoredFields,
		coversFrom: Schema.Number,
		coversTo: Schema.Number,
		kind: Schema.Literals(["summary"]),
		level: SummaryLevelSchema,
		precedence: Schema.Literals(["routine"]),
		sourceRef: Schema.Null,
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

export const entryBodies = (entries: ReadonlyArray<BoardEntryRow>): ReadonlyArray<string> => entries.map((entry) => entry.body);

export const nextSequence = (last: Option.Option<{ readonly seq: number }>) =>
	Option.match(last, {
		onNone: () => 1,
		onSome: (entry) => entry.seq + 1,
	});

const UNSUMMARIZED = { coversFrom: null, coversTo: null, level: null } as const;

export const storedEntryVariant = (input: EntryInput): BoardEntryVariant =>
	EntryInput.$match(input, {
		Mail: ({ precedence, sourceRef }): BoardEntryVariant => ({
			...UNSUMMARIZED,
			kind: "mail",
			precedence,
			sourceRef,
		}),
		Note: ({ sourceRef }): BoardEntryVariant => ({
			...UNSUMMARIZED,
			kind: "note",
			precedence: "routine",
			sourceRef: sourceRef ?? null,
		}),
		PieceSummary: ({ pieceId }): BoardEntryVariant => ({
			...UNSUMMARIZED,
			kind: "pieceSummary",
			precedence: "routine",
			sourceRef: pieceId,
		}),
		Summary: ({ coversFrom, coversTo, level }): BoardEntryVariant => ({
			coversFrom,
			coversTo,
			kind: "summary",
			level,
			precedence: "routine",
			sourceRef: null,
		}),
	});

export const entryRegister = (input: EntryInput) =>
	EntryInput.$match(input, {
		Mail: ({ register }) => register,
		Note: ({ register }) => register,
		PieceSummary: () => "rough" as const,
		Summary: () => "smooth" as const,
	});

export const appendedEntry = (input: EntryInput, fields: AppendFields): BoardEntryRow => {
	const row = {
		authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
		body: input.body,
		createdAt: new Date(fields.nowMillis),
		id: crypto.randomUUID(),
		register: entryRegister(input),
		seq: fields.seq,
	};
	return { ...row, ...storedEntryVariant(input) };
};
