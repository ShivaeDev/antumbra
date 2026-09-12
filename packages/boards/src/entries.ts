import { BoardRegisterSchema } from "@antumbra/platform-vocabulary/board.ts";
import { Effect, Option, Schema } from "effect";
import { StoredBoardEntryInvalid } from "#errors.ts";
import type { AppendFields, BoardEntryRow, MailEntry, MailRow } from "#model.ts";

const StoredMail = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	body: Schema.String,
	createdAt: Schema.Date,
	id: Schema.String,
	kind: Schema.Literals(["mail"]),
	precedence: Schema.Literals(["flash", "priority", "routine"]),
	register: BoardRegisterSchema,
	seq: Schema.Number,
	sourceRef: Schema.String,
});

export const mailRow = (row: unknown) =>
	Schema.decodeUnknownEffect(StoredMail)(row).pipe(
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

export const appendedMail = (input: MailEntry, fields: AppendFields): MailRow => ({
	authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
	body: input.body,
	createdAt: new Date(fields.nowMillis),
	id: crypto.randomUUID(),
	kind: "mail",
	precedence: input.precedence,
	register: input.register,
	seq: fields.seq,
	sourceRef: input.sourceRef,
});
