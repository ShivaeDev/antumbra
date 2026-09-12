import { Context, type Effect, type Option } from "effect";
import type { BoardWriteFailure } from "#errors.ts";
import type { BoardEntryRow, BoardScope, EntryInput } from "#model.ts";
import type { SmoothingDay, SmoothingSpan } from "#summaries.ts";

export interface BoardsService {
	readonly digest: (scope: BoardScope) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly read: (scope: BoardScope) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly span: (scope: BoardScope) => Effect.Effect<Option.Option<SmoothingSpan>>;
	readonly uncovered: (scope: BoardScope) => Effect.Effect<ReadonlyArray<SmoothingDay>>;
	readonly under: (scope: BoardScope, summaryId: string) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly write: (scope: BoardScope, input: EntryInput) => Effect.Effect<BoardEntryRow, BoardWriteFailure>;
}

export class Boards extends Context.Service<Boards, BoardsService>()("@antumbra/boards/Boards") {}
