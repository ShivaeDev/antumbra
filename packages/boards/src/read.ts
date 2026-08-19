import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import type { StoredBoardOwnerKindInvalid } from "@antumbra/vocabulary/board";
import { Effect, Option } from "effect";
import { entryRow } from "#entries.ts";
import type { BoardOwnerNotFound, StoredBoardEntryInvalid } from "#errors.ts";
import type { BoardEntryRow, BoardScope } from "#model.ts";
import { linkedBoardId, requireBoardOwner } from "#owner.ts";
import type { BoardsReturn } from "#requirements.ts";

const entriesOn = (boardId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const rows = yield* db.BoardEntry.where({ boardId })
			.orderBy((entry) => entry.seq.asc())
			.all();
		return yield* Effect.forEach(rows, entryRow);
	});

export const readBoard = Effect.fn("boards.readBoard")(function* (
	scope: BoardScope,
): BoardsReturn<
	ReadonlyArray<BoardEntryRow>,
	| BoardOwnerNotFound
	| PrismaError
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid,
	WriteExecutors
> {
	yield* requireBoardOwner(scope);
	const linked = yield* linkedBoardId(scope);
	return yield* Option.match(linked, {
		onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
		onSome: entriesOn,
	});
});
