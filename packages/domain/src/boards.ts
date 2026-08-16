import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { Clock, Effect, Option, PubSub } from "effect";
import { requireBoardOwner } from "#board-owner.ts";
import {
	appendedEntry,
	type BoardEntryRow,
	type EntryInput,
	entryRow,
	nextSequence,
} from "#board-rows.ts";
import { type BoardScope, linkBoard, linkedBoardId } from "#board-scope.ts";
import { replayedEntry } from "#board-source.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type {
	BoardOwnerNotFound,
	BoardSourceConflict,
	StoredBoardEntryInvalid,
} from "#errors.ts";

export type BoardWriteFailure =
	| BoardOwnerNotFound
	| BoardSourceConflict
	| PrismaError
	| StoredBoardEntryInvalid;

const entriesOn = (db: DatabaseService, boardId: string) =>
	db.BoardEntry.where({ boardId })
		.orderBy((entry) => entry.seq.asc())
		.all()
		.pipe(Effect.flatMap((rows) => Effect.forEach(rows, entryRow)));

export const boardEntries = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<
	ReadonlyArray<BoardEntryRow>,
	BoardOwnerNotFound | PrismaError | StoredBoardEntryInvalid,
	WriteExecutors
> =>
	Effect.gen(function* () {
		yield* requireBoardOwner(scope).pipe(Effect.provideService(Database, db));
		const linked = yield* linkedBoardId(db, scope);
		return yield* Option.match(linked, {
			onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
			onSome: (boardId) => entriesOn(db, boardId),
		});
	});

export const ensureBoard = (
	deps: AgentDeps,
	scope: BoardScope,
): Effect.Effect<string, BoardOwnerNotFound | PrismaError> =>
	provideExecutors(deps)(
		deps.writer.write(
			Effect.gen(function* () {
				yield* requireBoardOwner(scope).pipe(
					Effect.provideService(Database, deps.db),
				);
				const linked = yield* linkedBoardId(deps.db, scope);
				if (Option.isSome(linked)) {
					return linked.value;
				}
				const boardId = crypto.randomUUID();
				yield* deps.db.Board.create({ id: boardId });
				yield* linkBoard(deps.db, scope, boardId);
				return boardId;
			}),
		),
	);

export const writeEntry = (
	deps: AgentDeps,
	scope: BoardScope,
	input: EntryInput,
): Effect.Effect<BoardEntryRow, BoardWriteFailure> => {
	const priorSource = (boardId: string, sourceRef: string) =>
		deps.db.BoardEntry.where({ boardId, sourceRef }).first();
	return Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const result = yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					yield* requireBoardOwner(scope).pipe(
						Effect.provideService(Database, deps.db),
					);
					const linked = yield* linkedBoardId(deps.db, scope);
					const boardId = Option.getOrElse(linked, () => crypto.randomUUID());
					if (Option.isNone(linked)) {
						yield* deps.db.Board.create({ id: boardId });
						yield* linkBoard(deps.db, scope, boardId);
					}
					const prior =
						input.sourceRef === undefined
							? Option.none()
							: yield* priorSource(boardId, input.sourceRef);
					if (Option.isSome(prior)) {
						return {
							row: yield* replayedEntry(boardId, input, prior.value),
							written: false,
						};
					}
					const last = yield* deps.db.BoardEntry.where({ boardId })
						.orderBy((entry) => entry.seq.desc())
						.first();
					const row = appendedEntry(input, {
						nowMillis: now,
						seq: nextSequence(last),
					});
					yield* deps.db.BoardEntry.create({ ...row, boardId });
					return { row, written: true };
				}),
			),
		);
		if (result.written && scope.kind !== "agent") {
			yield* PubSub.publish(deps.feeds.voyages, undefined);
		}
		return result.row;
	});
};
