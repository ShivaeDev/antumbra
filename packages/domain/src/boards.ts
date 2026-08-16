import {
	Database,
	type DatabaseService,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import { Clock, Effect, Option, PubSub } from "effect";
import {
	appendedEntry,
	type BoardEntryRow,
	type EntryInput,
	entryRow,
	nextSequence,
	smoothBodies,
} from "#board-rows.ts";
import {
	type BoardScope,
	linkBoard,
	linkedBoardId,
	ownerOf,
} from "#board-scope.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import { BoardOwnerNotFound } from "#errors.ts";

const entriesOn = (db: DatabaseService, boardId: string) =>
	db.BoardEntry.where({ boardId })
		.orderBy((entry) => entry.seq.asc())
		.all()
		.pipe(Effect.map((rows) => rows.map(entryRow)));

const boardOwnerExists = (scope: BoardScope) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (scope.kind === "agent") {
			return yield* db.Agent.where({ id: scope.agentId }).exists();
		}
		if (scope.kind === "piece") {
			return yield* db.Piece.where({ id: scope.pieceId }).exists();
		}
		return yield* db.Voyage.where({ id: scope.voyageId }).exists();
	});

// why: a board is a log, so entries reach a reader in the order their appends
// claimed; a current owner with no board reads empty, while a retained link for
// a missing owner is refused instead of exposing an orphaned address.
export const boardEntries = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<
	ReadonlyArray<BoardEntryRow>,
	BoardOwnerNotFound | PrismaError,
	WriteExecutors
> => {
	return Effect.gen(function* () {
		const ownerExists = yield* boardOwnerExists(scope).pipe(
			Effect.provideService(Database, db),
		);
		if (!ownerExists) {
			return yield* new BoardOwnerNotFound(ownerOf(scope));
		}
		const linked = yield* linkedBoardId(db, scope);
		return yield* Option.match(linked, {
			onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
			onSome: (boardId) => entriesOn(db, boardId),
		});
	});
};

// why: what a composed charter reads. The rough log is scratch for the agent
// that wrote it; the smooth log is what the entity wants its successors told.
export const smoothLog = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<
	ReadonlyArray<string>,
	BoardOwnerNotFound | PrismaError,
	WriteExecutors
> => boardEntries(db, scope).pipe(Effect.map(smoothBodies));

// why: owner validation, link lookup and any materialization share the same
// serialized transaction, so a known link never bypasses its current owner.
export const ensureBoard = (
	deps: AgentDeps,
	scope: BoardScope,
): Effect.Effect<string, BoardOwnerNotFound | PrismaError> => {
	return provideExecutors(deps)(
		deps.writer.write(
			Effect.gen(function* () {
				const ownerExists = yield* boardOwnerExists(scope).pipe(
					Effect.provideService(Database, deps.db),
				);
				if (!ownerExists) {
					return yield* new BoardOwnerNotFound(ownerOf(scope));
				}
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
};

// why: the sequence is read and claimed inside the same serialized write as the
// append, so two hands writing at once take two places; the unique index on
// (boardId, seq) fails the second rather than letting one board hold two
// entries at the same position.
export const writeEntry = (
	deps: AgentDeps,
	scope: BoardScope,
	input: EntryInput,
): Effect.Effect<BoardEntryRow, BoardOwnerNotFound | PrismaError> => {
	return Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		const row = yield* provideExecutors(deps)(
			deps.writer.write(
				Effect.gen(function* () {
					const ownerExists = yield* boardOwnerExists(scope).pipe(
						Effect.provideService(Database, deps.db),
					);
					if (!ownerExists) {
						return yield* new BoardOwnerNotFound(ownerOf(scope));
					}
					const linked = yield* linkedBoardId(deps.db, scope);
					const boardId = Option.getOrElse(linked, () => crypto.randomUUID());
					if (Option.isNone(linked)) {
						yield* deps.db.Board.create({ id: boardId });
						yield* linkBoard(deps.db, scope, boardId);
					}
					const last = yield* deps.db.BoardEntry.where({ boardId })
						.orderBy((entry) => entry.seq.desc())
						.first();
					const appended = appendedEntry(input, {
						nowMillis: now,
						seq: nextSequence(last),
					});
					yield* deps.db.BoardEntry.create({ ...appended, boardId });
					return appended;
				}),
			),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
		return row;
	});
};
