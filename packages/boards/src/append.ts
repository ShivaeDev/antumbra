import { Database, type PrismaError } from "@antumbra/persistence";
import { type Context, Effect, Option } from "effect";
import { appendedMail, nextSequence } from "#entries.ts";
import type { BoardSourceConflict, StoredBoardEntryInvalid } from "#errors.ts";
import type { MailEntry, MailRow } from "#model.ts";
import { replayedMail } from "#source.ts";

export function appendMail(
	boardId: string,
	input: MailEntry,
	nowMillis: number,
): Effect.Effect<MailRow, BoardSourceConflict | PrismaError | StoredBoardEntryInvalid, Context.Service.Identifier<typeof Database>> {
	return Effect.gen(function* () {
		const db = yield* Database;
		const prior = yield* db.BoardEntry.where({ boardId, sourceRef: input.sourceRef }).first();
		if (Option.isSome(prior)) {
			return yield* replayedMail(boardId, input, prior.value);
		}
		const last = yield* db.BoardEntry.where({ boardId })
			.orderBy((entry) => entry.seq.desc())
			.select("seq")
			.first();
		const row = appendedMail(input, { nowMillis, seq: nextSequence(last) });
		return yield* db.BoardEntry.create({ ...row, coversFrom: null, coversTo: null, level: null, boardId }).pipe(Effect.as(row));
	});
}
