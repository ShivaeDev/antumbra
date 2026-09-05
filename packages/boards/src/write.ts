import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { appendEntry } from "#append.ts";
import { BoardScope, type EntryInput } from "#model.ts";
import { linkBoard, linkedBoardId, requireBoardOwner } from "#owner.ts";

const boardFor = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* requireBoardOwner(scope);
		const linked = yield* linkedBoardId(scope);
		if (Option.isSome(linked)) {
			return linked.value;
		}
		const boardId = crypto.randomUUID();
		yield* db.Board.create({ id: boardId });
		yield* linkBoard(scope, boardId);
		return boardId;
	});

export const ensureBoard = Effect.fn("Boards.ensure")(boardFor);

export const writeEntry = Effect.fn("Boards.write")(function* (scope: BoardScope, input: EntryInput) {
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const boardId = yield* boardFor(scope);
	const result = yield* appendEntry(boardId, input, now);
	const publishesVoyage = BoardScope.$match(scope, {
		Agent: () => false,
		Piece: () => true,
		Voyage: () => true,
	});
	if (result.written && publishesVoyage) {
		yield* feeds.publishVoyageRefresh();
	}
	return result.row;
});
