import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { appendEntry } from "#append.ts";
import { BoardScope, type EntryInput } from "#model.ts";
import { linkBoard, linkedBoardId, requireBoardOwner } from "#owner.ts";

const recoverBoardLink = (
	scope: BoardScope,
	boardId: string,
	failure: PrismaError,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const linked = yield* linkedBoardId(scope);
		if (Option.isNone(linked)) {
			return yield* failure;
		}
		if (linked.value !== boardId) {
			yield* db.Board.where({ id: boardId }).deleteAll();
		}
		return linked.value;
	});

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
		return yield* linkBoard(scope, boardId).pipe(
			Effect.as(boardId),
			Effect.catchTag("PrismaError", (failure) =>
				recoverBoardLink(scope, boardId, failure),
			),
		);
	});

// why: the SQLite driver opens every transaction deferred, so a bare write
// committing between another transaction's read and its write fails that
// transaction with a snapshot conflict; transactional writers are serialised.
export const ensureBoard = Effect.fn("boards.ensureBoard")(function* (
	scope: BoardScope,
) {
	return yield* Database.use((db) => db.transaction(boardFor(scope)));
});

const appendTo = (scope: BoardScope, input: EntryInput, nowMillis: number) =>
	Effect.gen(function* () {
		const boardId = yield* boardFor(scope);
		return yield* appendEntry(boardId, input, nowMillis);
	});

export const writeEntry = Effect.fn("boards.writeEntry")(function* (
	scope: BoardScope,
	input: EntryInput,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const result = yield* db.transaction(appendTo(scope, input, now));
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
