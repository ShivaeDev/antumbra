import { Context, type Effect, type Option } from "effect";
import type { BoardSourceConflict, BoardWriteFailure, MailFailure, MailNotAddressed } from "#errors.ts";
import type { BoardEntryInput, BoardEntryRow, BoardScope, MailInput, MailRow, UnreadMailRow } from "#model.ts";
import type { SmoothingDay, SmoothingSpan } from "#summaries.ts";

export interface BoardsService {
	readonly digest: (scope: BoardScope) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly mail: (input: MailInput) => Effect.Effect<MailRow, BoardSourceConflict | MailFailure>;
	readonly markDelivered: (agentId: string, entryIds: ReadonlyArray<string>) => Effect.Effect<void, MailFailure | MailNotAddressed>;
	readonly markRead: (agentId: string, entryIds: ReadonlyArray<string>) => Effect.Effect<void, MailFailure | MailNotAddressed>;
	readonly read: (scope: BoardScope) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly span: (scope: BoardScope) => Effect.Effect<Option.Option<SmoothingSpan>>;
	readonly uncovered: (scope: BoardScope) => Effect.Effect<ReadonlyArray<SmoothingDay>>;
	readonly under: (scope: BoardScope, summaryId: string) => Effect.Effect<ReadonlyArray<BoardEntryRow>>;
	readonly unread: (agentId: string) => Effect.Effect<ReadonlyArray<UnreadMailRow>, MailFailure>;
	readonly write: (scope: BoardScope, input: BoardEntryInput) => Effect.Effect<BoardEntryRow, BoardWriteFailure>;
}

export class Boards extends Context.Service<Boards, BoardsService>()("@antumbra/boards/Boards") {}
