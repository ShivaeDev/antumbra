import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { entryRow } from "#entries.ts";
import { MailNotAddressed } from "#errors.ts";
import { BoardScope, EntryInput, type MailInput } from "#model.ts";
import { linkedBoardId, requireBoardOwner } from "#owner.ts";
import { writeEntry } from "#write.ts";

const alreadyReadEntryIds = Effect.fnUntraced(function* (entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const receipts = yield* db.BoardEntryReceipt.where((receipt) => receipt.entryId.in(entryIds)).all();
	return new Set(receipts.map((receipt) => receipt.entryId));
});

const mailEntries = Effect.fnUntraced(function* (agentId: string, entryIds?: ReadonlyArray<string>) {
	const db = yield* Database;
	const scope = BoardScope.Agent({ agentId });
	yield* requireBoardOwner(scope);
	const boardId = yield* linkedBoardId(scope);
	if (Option.isNone(boardId)) {
		return [];
	}
	const mail = db.BoardEntry.where({ boardId: boardId.value, kind: "mail" });
	const requested = entryIds === undefined ? mail : mail.where((entry) => entry.id.in(entryIds));
	return yield* Effect.forEach(yield* requested.orderBy((entry) => entry.seq.asc()).all(), entryRow);
});

export const mail = Effect.fn("Boards.mail")((input: MailInput) =>
	writeEntry(
		BoardScope.Agent({ agentId: input.toAgentId }),
		EntryInput.Mail({
			authorAgentId: input.authorAgentId,
			body: input.body,
			precedence: input.precedence,
			register: "smooth",
			sourceRef: input.sourceRef,
		}),
	),
);

export const unreadMail = Effect.fn("Boards.unread")(function* (agentId: string) {
	const entries = yield* mailEntries(agentId);
	const read = yield* alreadyReadEntryIds(entries.map((entry) => entry.id));
	return entries.filter((entry) => !read.has(entry.id));
});

export const markMailRead = Effect.fn("Boards.markRead")(function* (agentId: string, entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const entries = yield* mailEntries(agentId, entryIds);
	const addressed = new Set(entries.map((entry) => entry.id));
	const requested = new Set(entryIds);
	const stray = [...requested].find((entryId) => !addressed.has(entryId));
	if (stray !== undefined) {
		return yield* new MailNotAddressed({ agentId, entryId: stray });
	}
	const read = yield* alreadyReadEntryIds([...requested]);
	yield* Effect.forEach(
		[...requested].filter((entryId) => !read.has(entryId)),
		(entryId) => db.BoardEntryReceipt.create({ entryId }),
		{ discard: true },
	);
});
