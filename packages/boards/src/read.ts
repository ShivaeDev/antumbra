import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { entryRow } from "#entries.ts";
import type { BoardEntryRow, BoardScope } from "#model.ts";
import { linkedBoardId, requireBoardOwner } from "#owner.ts";

const entriesOn = Effect.fnUntraced(function* (boardId: string) {
	const db = yield* Database;
	const rows = yield* db.BoardEntry.where({ boardId })
		.orderBy((entry) => entry.seq.asc())
		.all();
	return yield* Effect.forEach(rows, entryRow);
});

export const readBoard = Effect.fn("boards.readBoard")(function* (scope: BoardScope) {
	yield* requireBoardOwner(scope);
	const linked = yield* linkedBoardId(scope);
	return yield* Option.match(linked, {
		onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
		onSome: entriesOn,
	});
});
