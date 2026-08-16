import type { PrismaError } from "@antumbra/persistence";
import type { Effect } from "effect";
import type { BoardEntryRow, EntryInput } from "#board-rows.ts";
import type { BoardScope } from "#board-scope.ts";
import { boardEntries, ensureBoard, writeEntry } from "#boards.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import type { BoardOwnerNotFound } from "#errors.ts";

export type BoardFailure = BoardOwnerNotFound | PrismaError;

export interface BoardProcedures {
	readonly ensure: (scope: BoardScope) => Effect.Effect<string, BoardFailure>;
	readonly read: (
		scope: BoardScope,
	) => Effect.Effect<ReadonlyArray<BoardEntryRow>, BoardFailure>;
	readonly write: (
		scope: BoardScope,
		input: EntryInput,
	) => Effect.Effect<BoardEntryRow, BoardFailure>;
}

export const makeBoardProcedures = (deps: AgentDeps): BoardProcedures => ({
	ensure: (scope) => ensureBoard(deps, scope),
	read: (scope) => provideExecutors(deps)(boardEntries(deps.db, scope)),
	write: (scope, input) => writeEntry(deps, scope, input),
});
