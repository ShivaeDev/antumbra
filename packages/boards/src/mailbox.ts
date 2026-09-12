import { Database } from "@antumbra/persistence";
import { Clock, type Context, Effect, Option } from "effect";
import { appendMail } from "#append.ts";
import { mailRow } from "#entries.ts";
import { MailNotAddressed } from "#errors.ts";
import { EntryInput, type MailInput, type UnreadMailRow } from "#model.ts";
import { linkedMailbox, openMailbox, requireMailbox } from "#owner.ts";

type Store = Effect.Success<typeof Database>;

type Stored = Context.Service.Identifier<typeof Database>;

const alreadyReadEntryIds = Effect.fnUntraced(function* (entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const receipts = yield* db.BoardEntryReceipt.where((receipt) => receipt.entryId.in(entryIds)).all();
	return new Set(receipts.map((receipt) => receipt.entryId));
});

const alreadyDeliveredEntryIds = Effect.fnUntraced(function* (entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const deliveries = yield* db.BoardEntryDelivery.where((delivery) => delivery.entryId.in(entryIds)).all();
	return new Set(deliveries.map((delivery) => delivery.entryId));
});

const mailEntries = Effect.fnUntraced(function* (agentId: string, entryIds?: ReadonlyArray<string>) {
	const db = yield* Database;
	yield* requireMailbox(agentId);
	const boardId = yield* linkedMailbox(agentId);
	if (Option.isNone(boardId)) {
		return [];
	}
	const mail = db.BoardEntry.where({ boardId: boardId.value, kind: "mail" });
	const requested = entryIds === undefined ? mail : mail.where((entry) => entry.id.in(entryIds));
	return yield* Effect.forEach(yield* requested.orderBy((entry) => entry.seq.asc()).all(), mailRow);
});

export const mail = Effect.fn("Boards.mail")(function* (input: MailInput) {
	const now = yield* Clock.currentTimeMillis;
	const boardId = yield* openMailbox(input.toAgentId);
	return yield* appendMail(
		boardId,
		EntryInput.Mail({
			authorAgentId: input.authorAgentId,
			body: input.body,
			precedence: input.precedence,
			register: "smooth",
			sourceRef: input.sourceRef,
		}),
		now,
	);
});

export const unreadMail = Effect.fn("Boards.unread")(function* (agentId: string) {
	const entries = yield* mailEntries(agentId);
	const ids = entries.map((entry) => entry.id);
	const read = yield* alreadyReadEntryIds(ids);
	const delivered = yield* alreadyDeliveredEntryIds(ids);
	return entries.filter((entry) => !read.has(entry.id)).map((entry) => ({ ...entry, delivered: delivered.has(entry.id) }) satisfies UnreadMailRow);
});

const stampable = Effect.fnUntraced(function* (agentId: string, entryIds: ReadonlyArray<string>, stamped: ReadonlySet<string>) {
	const entries = yield* mailEntries(agentId, entryIds);
	const addressed = new Set(entries.map((entry) => entry.id));
	const requested = [...new Set(entryIds)];
	const stray = requested.find((entryId) => !addressed.has(entryId));
	return stray === undefined ? requested.filter((entryId) => !stamped.has(entryId)) : yield* new MailNotAddressed({ agentId, entryId: stray });
});

export const markMailRead = Effect.fn("Boards.markRead")(function* (agentId: string, entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const unread = yield* stampable(agentId, entryIds, yield* alreadyReadEntryIds(entryIds));
	yield* Effect.forEach(unread, (entryId) => db.BoardEntryReceipt.create({ entryId }), { discard: true });
});

export const markMailDelivered = Effect.fn("Boards.markDelivered")(function* (agentId: string, entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const undelivered = yield* stampable(agentId, entryIds, yield* alreadyDeliveredEntryIds(entryIds));
	yield* Effect.forEach(undelivered, (entryId) => db.BoardEntryDelivery.create({ entryId }), { discard: true });
});

export const mailboxOver = (store: Store) => {
	const held = <Value, Failure>(act: Effect.Effect<Value, Failure, Stored>) => Effect.provideService(act, Database, store);
	return {
		mail: (input: MailInput) => held(mail(input)),
		markDelivered: (agentId: string, entryIds: ReadonlyArray<string>) => held(markMailDelivered(agentId, entryIds)),
		markRead: (agentId: string, entryIds: ReadonlyArray<string>) => held(markMailRead(agentId, entryIds)),
		unread: (agentId: string) => held(unreadMail(agentId)),
	};
};
