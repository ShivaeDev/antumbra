import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { entryRow } from "#entries.ts";
import type { BoardEntryRow, BoardScope } from "#model.ts";
import { linkedBoardId, requireBoardOwner } from "#owner.ts";
import { digestOf, entriesUnder, uncoveredDays, uncoveredSpan } from "#summaries.ts";

const entriesOn = Effect.fnUntraced(function* (boardId: string) {
	const db = yield* Database;
	const rows = yield* db.BoardEntry.where({ boardId })
		.orderBy((entry) => entry.seq.asc())
		.all();
	return yield* Effect.forEach(rows, entryRow);
});

const entriesFor = Effect.fnUntraced(function* (scope: BoardScope) {
	yield* requireBoardOwner(scope);
	const linked = yield* linkedBoardId(scope);
	return yield* Option.match(linked, {
		onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
		onSome: entriesOn,
	});
});

export const readBoard = Effect.fn("Boards.read")(entriesFor);

export const readDigest = Effect.fn("Boards.digest")((scope: BoardScope) => Effect.map(entriesFor(scope), digestOf));

export const readUncoveredDays = Effect.fn("Boards.uncovered")((scope: BoardScope) => Effect.map(entriesFor(scope), uncoveredDays));

export const readUncoveredSpan = Effect.fn("Boards.span")((scope: BoardScope) => Effect.map(entriesFor(scope), uncoveredSpan));

export const readUnder = Effect.fn("Boards.under")((scope: BoardScope, summaryId: string) =>
	Effect.map(entriesFor(scope), (entries) => entriesUnder(entries, summaryId)),
);
