import { DomainFeeds } from "@antumbra/domain-feeds";
import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import type {
	BoardOwnerNotFound,
	BoardSourceConflict,
	MailNotAddressed,
	StoredBoardEntryInvalid,
} from "#errors.ts";
import { mail, markMailRead, unreadMail } from "#mailbox.ts";
import type {
	BoardEntryRow,
	BoardScope,
	EntryInput,
	MailInput,
} from "#model.ts";
import { readBoard } from "#read.ts";
import { ensureBoard, writeEntry } from "#write.ts";

export type BoardWriteFailure =
	| BoardOwnerNotFound
	| BoardSourceConflict
	| PrismaError
	| StoredBoardEntryInvalid;

export type BoardReadFailure =
	| BoardOwnerNotFound
	| PrismaError
	| StoredBoardEntryInvalid;

export type MarkReadFailure = BoardReadFailure | MailNotAddressed;

export class Boards extends Context.Service<
	Boards,
	{
		readonly ensure: (
			scope: BoardScope,
		) => Effect.Effect<string, BoardOwnerNotFound | PrismaError>;
		readonly mail: (
			input: MailInput,
		) => Effect.Effect<BoardEntryRow, BoardWriteFailure>;
		readonly markRead: (
			agentId: string,
			entryIds: ReadonlyArray<string>,
		) => Effect.Effect<void, MarkReadFailure>;
		readonly read: (
			scope: BoardScope,
		) => Effect.Effect<ReadonlyArray<BoardEntryRow>, BoardReadFailure>;
		readonly unread: (
			agentId: string,
		) => Effect.Effect<ReadonlyArray<BoardEntryRow>, BoardReadFailure>;
		readonly write: (
			scope: BoardScope,
			input: EntryInput,
		) => Effect.Effect<BoardEntryRow, BoardWriteFailure>;
	}
>()("@antumbra/boards/Boards") {}

export type BoardsService = Context.Service.Shape<typeof Boards>;

export const BoardsLive = Layer.effect(Boards)(
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const feeds = yield* DomainFeeds;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(Writer, writer),
				Context.add(DomainFeeds, feeds),
			),
		);
		return {
			ensure: (scope) => Effect.provide(ensureBoard(scope), context),
			mail: (input) => Effect.provide(mail(input), context),
			markRead: (agentId, entryIds) =>
				Effect.provide(markMailRead(agentId, entryIds), context).pipe(
					Effect.asVoid,
				),
			read: (scope) => Effect.provide(readBoard(scope), context),
			unread: (agentId) => Effect.provide(unreadMail(agentId), context),
			write: (scope, input) =>
				Effect.provide(writeEntry(scope, input), context),
		};
	}),
);
