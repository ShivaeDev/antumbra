import type { PrismaError } from "@antumbra/persistence";
import { Effect, type Option } from "effect";
import type { BoardEntryRow, EntryInput, MailPrecedence } from "#board-rows.ts";
import type { BoardScope } from "#board-scope.ts";
import {
	type BoardWriteFailure,
	boardEntries,
	ensureBoard,
	writeEntry,
} from "#boards.ts";
import { type AgentDeps, provideExecutors } from "#deps.ts";
import {
	type BoardOwnerNotFound,
	MailNotAddressed,
	type StoredBoardEntryInvalid,
} from "#errors.ts";

export type BoardReadFailure =
	| BoardOwnerNotFound
	| PrismaError
	| StoredBoardEntryInvalid;

export interface MailInput {
	readonly authorAgentId: Option.Option<string>;
	readonly body: string;
	readonly precedence: MailPrecedence;
	readonly sourceRef: string;
	readonly toAgentId: string;
}

export type MarkReadFailure = BoardReadFailure | MailNotAddressed;

const readIds = (receipts: ReadonlyArray<{ readonly entryId: string }>) =>
	new Set(receipts.map((receipt) => receipt.entryId));

export interface BoardProcedures {
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

export const makeBoardProcedures = (deps: AgentDeps): BoardProcedures => {
	const provide = provideExecutors(deps);
	const mailbox = (agentId: string): BoardScope => ({
		agentId,
		kind: "agent",
	});
	const entriesOf = (agentId: string) =>
		provide(boardEntries(deps.db, mailbox(agentId)));
	const mailEntries = (agentId: string) =>
		entriesOf(agentId).pipe(
			Effect.map((entries) => entries.filter((entry) => entry.kind === "mail")),
		);
	const receiptIds = provide(deps.db.BoardEntryReceipt.all()).pipe(
		Effect.map(readIds),
	);
	const unread = (agentId: string) =>
		Effect.gen(function* () {
			const entries = yield* mailEntries(agentId);
			const read = yield* receiptIds;
			return entries.filter((entry) => !read.has(entry.id));
		});
	const markRead = (agentId: string, entryIds: ReadonlyArray<string>) =>
		Effect.gen(function* () {
			const entries = yield* mailEntries(agentId);
			const addressed = new Set(entries.map((entry) => entry.id));
			const requested = new Set(entryIds);
			const stray = [...requested].find((entryId) => !addressed.has(entryId));
			if (stray !== undefined) {
				return yield* new MailNotAddressed({ agentId, entryId: stray });
			}
			yield* provide(
				deps.writer.write(
					Effect.gen(function* () {
						const read = readIds(yield* deps.db.BoardEntryReceipt.all());
						yield* Effect.forEach(
							[...requested].filter((entryId) => !read.has(entryId)),
							(entryId) => deps.db.BoardEntryReceipt.create({ entryId }),
						);
					}),
				),
			).pipe(Effect.asVoid);
		});
	return {
		ensure: (scope) => ensureBoard(deps, scope),
		mail: (input) =>
			writeEntry(deps, mailbox(input.toAgentId), {
				authorAgentId: input.authorAgentId,
				body: input.body,
				kind: "mail",
				precedence: input.precedence,
				register: "smooth",
				sourceRef: input.sourceRef,
			}),
		markRead,
		read: (scope) => provide(boardEntries(deps.db, scope)),
		unread,
		write: (scope, input) => writeEntry(deps, scope, input),
	};
};
