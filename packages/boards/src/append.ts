import { Database, type PrismaError } from "@antumbra/persistence";
import { type Context, Effect, Option } from "effect";
import { appendedEntry, nextSequence, storedEntryVariant } from "#entries.ts";
import type { BoardSourceConflict, StoredBoardEntryInvalid } from "#errors.ts";
import type { BoardEntryRow, EntryInput } from "#model.ts";
import { replayedEntry } from "#source.ts";

const priorEntry = (boardId: string, input: EntryInput) => {
	const sourceRef = storedEntryVariant(input).sourceRef;
	if (sourceRef === null) {
		return Effect.succeed(Option.none());
	}
	return Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.BoardEntry.where({
			boardId,
			sourceRef,
		}).first();
	});
};

interface AppendResult {
	readonly row: BoardEntryRow;
	readonly written: boolean;
}

export function appendEntry(
	boardId: string,
	input: EntryInput,
	nowMillis: number,
): Effect.Effect<AppendResult, BoardSourceConflict | PrismaError | StoredBoardEntryInvalid, Context.Service.Identifier<typeof Database>> {
	return Effect.gen(function* () {
		const db = yield* Database;
		const prior = yield* priorEntry(boardId, input);
		if (Option.isSome(prior)) {
			return {
				row: yield* replayedEntry(boardId, input, prior.value),
				written: false,
			};
		}
		const last = yield* db.BoardEntry.where({ boardId })
			.orderBy((entry) => entry.seq.desc())
			.select("seq")
			.first();
		const row: BoardEntryRow = appendedEntry(input, {
			nowMillis,
			seq: nextSequence(last),
		});
		return yield* db.BoardEntry.create({ ...row, boardId }).pipe(Effect.as({ row, written: true } satisfies AppendResult));
	});
}
