import type { PrismaError } from "@antumbra/persistence";
import type { Effect } from "effect";
import type { BoardScope } from "#board-scope.ts";
import {
	type BoardEntryRow,
	type EntryInput,
	ensureBoard,
	readBoard,
	writeEntry,
} from "#boards.ts";
import type { AgentDeps } from "#deps.ts";

export interface BoardProcedures {
	readonly ensure: (scope: BoardScope) => Effect.Effect<string, PrismaError>;
	readonly read: (
		scope: BoardScope,
	) => Effect.Effect<ReadonlyArray<BoardEntryRow>, PrismaError>;
	readonly write: (
		scope: BoardScope,
		input: EntryInput,
	) => Effect.Effect<BoardEntryRow, PrismaError>;
}

export const makeBoardProcedures = (deps: AgentDeps): BoardProcedures => ({
	ensure: (scope) => ensureBoard(deps, scope),
	read: (scope) => readBoard(deps, scope),
	write: (scope, input) => writeEntry(deps, scope, input),
});
