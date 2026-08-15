import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import { Effect, Option, PubSub } from "effect";
import { type BoardScope, linkBoard, linkedBoardId } from "#board-scope.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";

export type BoardRegister = "rough" | "smooth";

export interface BoardEntryRow {
	readonly authorAgentId: string | null;
	readonly body: string;
	readonly id: string;
	readonly register: string;
}

export interface EntryInput {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly register: BoardRegister;
}

const entryRow = (row: BoardEntryRow): BoardEntryRow => ({
	authorAgentId: row.authorAgentId,
	body: row.body,
	id: row.id,
	register: row.register,
});

const entriesOn = (db: DatabaseService, boardId: string) =>
	db.BoardEntry.where({ boardId })
		.orderBy((entry) => entry.createdAt.asc())
		.all()
		.pipe(Effect.map((rows) => rows.map(entryRow)));

// why: a board is a log, so entries reach a reader in the order they were
// written; an entity nobody has written to yet has no board and reads empty
// rather than being created by the act of looking.
export const boardEntries = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<ReadonlyArray<BoardEntryRow>, PrismaError, WriteExecutors> =>
	linkedBoardId(db, scope).pipe(
		Effect.flatMap((linked) =>
			Option.match(linked, {
				onNone: () => Effect.succeed<ReadonlyArray<BoardEntryRow>>([]),
				onSome: (boardId) => entriesOn(db, boardId),
			}),
		),
	);

// why: what a composed charter reads. The rough log is scratch for the agent
// that wrote it; the smooth log is what the entity wants its successors told.
export const smoothLog = (
	db: DatabaseService,
	scope: BoardScope,
): Effect.Effect<ReadonlyArray<string>, PrismaError, WriteExecutors> =>
	boardEntries(db, scope).pipe(
		Effect.map((entries) =>
			entries
				.filter((entry) => entry.register === "smooth")
				.map((entry) => entry.body),
		),
	);

export const ensureBoard = (
	deps: AgentDeps,
	scope: BoardScope,
): Effect.Effect<string, PrismaError> => {
	const provide = provideExecutors(deps);
	return Effect.gen(function* () {
		const existing = yield* provide(linkedBoardId(deps.db, scope));
		if (Option.isSome(existing)) {
			return existing.value;
		}
		const boardId = crypto.randomUUID();
		yield* provide(
			deps.writer.write(
				deps.db.Board.create({ id: boardId }).pipe(
					Effect.andThen(linkBoard(deps.db, scope, boardId)),
				),
			),
		);
		return boardId;
	});
};

export const writeEntry = (
	deps: AgentDeps,
	scope: BoardScope,
	input: EntryInput,
): Effect.Effect<BoardEntryRow, PrismaError> =>
	Effect.gen(function* () {
		const boardId = yield* ensureBoard(deps, scope);
		const row: BoardEntryRow = {
			authorAgentId: Option.getOrElse(input.authorAgentId, () => null),
			body: input.body,
			id: crypto.randomUUID(),
			register: input.register,
		};
		yield* provideExecutors(deps)(
			deps.writer.write(deps.db.BoardEntry.create({ ...row, boardId })),
		);
		yield* PubSub.publish(deps.feeds.voyages, undefined);
		return row;
	});

export const readBoard = (
	deps: AgentDeps,
	scope: BoardScope,
): Effect.Effect<ReadonlyArray<BoardEntryRow>, PrismaError> =>
	provideExecutors(deps)(boardEntries(deps.db, scope));

export const readSmoothLog = (
	deps: AgentDeps,
	scope: BoardScope,
): Effect.Effect<ReadonlyArray<string>, PrismaError> =>
	provideExecutors(deps)(smoothLog(deps.db, scope));
