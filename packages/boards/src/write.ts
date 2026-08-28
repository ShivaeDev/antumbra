import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type PrismaError } from "@antumbra/persistence";
import { Clock, type Context, Effect, Option } from "effect";
import { appendedEntry, nextSequence, storedEntryVariant } from "#entries.ts";
import type { BoardSourceConflict, StoredBoardEntryInvalid } from "#errors.ts";
import { type BoardEntryRow, BoardScope, type EntryInput } from "#model.ts";
import { linkBoard, linkedBoardId, requireBoardOwner } from "#owner.ts";
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

export const ensureBoard = (scope: BoardScope) =>
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

interface AppendResult {
	readonly row: BoardEntryRow;
	readonly written: boolean;
}

const recoverAppend = (
	boardId: string,
	input: EntryInput,
	nowMillis: number,
	attempted: BoardEntryRow,
	failure: PrismaError,
): Effect.Effect<
	AppendResult,
	BoardSourceConflict | PrismaError | StoredBoardEntryInvalid,
	Context.Service.Identifier<typeof Database>
> =>
	Effect.gen(function* () {
		const prior = yield* priorEntry(boardId, input);
		if (Option.isSome(prior)) {
			return {
				row: yield* replayedEntry(boardId, input, prior.value),
				written: false,
			};
		}
		const db = yield* Database;
		const latest = yield* db.BoardEntry.where({ boardId })
			.orderBy((entry) => entry.seq.desc())
			.select("seq")
			.first();
		if (nextSequence(latest) > attempted.seq) {
			return yield* appendEntry(boardId, input, nowMillis);
		}
		return yield* failure;
	});

function appendEntry(
	boardId: string,
	input: EntryInput,
	nowMillis: number,
): Effect.Effect<
	AppendResult,
	BoardSourceConflict | PrismaError | StoredBoardEntryInvalid,
	Context.Service.Identifier<typeof Database>
> {
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
		return yield* db.BoardEntry.create({ ...row, boardId }).pipe(
			Effect.as({ row, written: true } satisfies AppendResult),
			Effect.catchTag("PrismaError", (failure) =>
				recoverAppend(boardId, input, nowMillis, row, failure),
			),
		);
	});
}

export const writeEntry = (scope: BoardScope, input: EntryInput) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const now = yield* Clock.currentTimeMillis;
		const boardId = yield* ensureBoard(scope);
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
