import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { StoredBoardOwnerKindInvalid } from "@antumbra/vocabulary/board";
import { Clock, Effect, Option, PubSub } from "effect";
import { appendedEntry, nextSequence, storedEntryVariant } from "#entries.ts";
import type {
	BoardOwnerNotFound,
	BoardSourceConflict,
	StoredBoardEntryInvalid,
} from "#errors.ts";
import { type BoardEntryRow, BoardScope, type EntryInput } from "#model.ts";
import { linkBoard, linkedBoardId, requireBoardOwner } from "#owner.ts";
import type { BoardsReturn } from "#requirements.ts";
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

export const ensureBoard = Effect.fn("boards.ensureBoard")(function* (
	scope: BoardScope,
): BoardsReturn<
	string,
	BoardOwnerNotFound | PrismaError | StoredBoardOwnerKindInvalid,
	WriteExecutors
> {
	const db = yield* Database;
	const writer = yield* Writer;
	return yield* writer.write(
		Effect.gen(function* () {
			yield* requireBoardOwner(scope);
			const linked = yield* linkedBoardId(scope);
			if (Option.isSome(linked)) {
				return linked.value;
			}
			const boardId = crypto.randomUUID();
			yield* db.Board.create({ id: boardId });
			yield* linkBoard(scope, boardId);
			return boardId;
		}),
	);
});

export const writeEntry = Effect.fn("boards.writeEntry")(function* (
	scope: BoardScope,
	input: EntryInput,
): BoardsReturn<
	BoardEntryRow,
	| BoardOwnerNotFound
	| BoardSourceConflict
	| PrismaError
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid,
	WriteExecutors
> {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const writer = yield* Writer;
	const now = yield* Clock.currentTimeMillis;
	const result = yield* writer.write(
		Effect.gen(function* () {
			yield* requireBoardOwner(scope);
			const linked = yield* linkedBoardId(scope);
			const boardId = Option.getOrElse(linked, () => crypto.randomUUID());
			if (Option.isNone(linked)) {
				yield* db.Board.create({ id: boardId });
				yield* linkBoard(scope, boardId);
			}
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
				nowMillis: now,
				seq: nextSequence(last),
			});
			yield* db.BoardEntry.create({ ...row, boardId });
			return { row, written: true };
		}),
	);
	const publishesVoyage = BoardScope.$match(scope, {
		Agent: () => false,
		Piece: () => true,
		Voyage: () => true,
	});
	if (result.written && publishesVoyage) {
		yield* PubSub.publish(feeds.voyages, undefined);
	}
	return result.row;
});
