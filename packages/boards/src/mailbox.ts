import {
	Database,
	type PrismaError,
	type WriteExecutors,
	Writer,
} from "@antumbra/persistence";
import type { StoredBoardOwnerKindInvalid } from "@antumbra/vocabulary/board";
import { Effect } from "effect";
import type {
	BoardOwnerNotFound,
	BoardSourceConflict,
	StoredBoardEntryInvalid,
} from "#errors.ts";
import { MailNotAddressed } from "#errors.ts";
import {
	type BoardEntryRow,
	BoardScope,
	EntryInput,
	type MailInput,
} from "#model.ts";
import { readBoard } from "#read.ts";
import type { BoardsReturn } from "#requirements.ts";
import { writeEntry } from "#write.ts";

const mailbox = (agentId: string): BoardScope => BoardScope.Agent({ agentId });

const readIds = (receipts: ReadonlyArray<{ readonly entryId: string }>) =>
	new Set(receipts.map((receipt) => receipt.entryId));

const mailEntries = (agentId: string) =>
	readBoard(mailbox(agentId)).pipe(
		Effect.map((entries) => entries.filter((entry) => entry.kind === "mail")),
	);

export const mail = Effect.fn("boards.mail")(function* (
	input: MailInput,
): BoardsReturn<
	BoardEntryRow,
	| BoardOwnerNotFound
	| BoardSourceConflict
	| PrismaError
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid,
	WriteExecutors
> {
	return yield* writeEntry(
		mailbox(input.toAgentId),
		EntryInput.Mail({
			authorAgentId: input.authorAgentId,
			body: input.body,
			precedence: input.precedence,
			register: "smooth",
			sourceRef: input.sourceRef,
		}),
	);
});

export const unreadMail = Effect.fn("boards.unreadMail")(function* (
	agentId: string,
): BoardsReturn<
	ReadonlyArray<BoardEntryRow>,
	| BoardOwnerNotFound
	| PrismaError
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid,
	WriteExecutors
> {
	const db = yield* Database;
	const entries = yield* mailEntries(agentId);
	const read = readIds(yield* db.BoardEntryReceipt.select("entryId"));
	return entries.filter((entry) => !read.has(entry.id));
});

export const markMailRead = Effect.fn("boards.markMailRead")(function* (
	agentId: string,
	entryIds: ReadonlyArray<string>,
): BoardsReturn<
	void,
	| BoardOwnerNotFound
	| StoredBoardEntryInvalid
	| StoredBoardOwnerKindInvalid
	| MailNotAddressed
	| PrismaError,
	WriteExecutors
> {
	const db = yield* Database;
	const writer = yield* Writer;
	const entries = yield* mailEntries(agentId);
	const addressed = new Set(entries.map((entry) => entry.id));
	const requested = new Set(entryIds);
	const stray = [...requested].find((entryId) => !addressed.has(entryId));
	if (stray !== undefined) {
		return yield* new MailNotAddressed({ agentId, entryId: stray });
	}
	yield* writer.write(
		Effect.gen(function* () {
			const read = readIds(yield* db.BoardEntryReceipt.select("entryId"));
			yield* Effect.forEach(
				[...requested].filter((entryId) => !read.has(entryId)),
				(entryId) => db.BoardEntryReceipt.create({ entryId }),
			);
		}),
	);
});
