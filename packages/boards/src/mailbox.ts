import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { MailNotAddressed } from "#errors.ts";
import { BoardScope, EntryInput, type MailInput } from "#model.ts";
import { readBoard } from "#read.ts";
import { writeEntry } from "#write.ts";

const readIds = (receipts: ReadonlyArray<{ readonly entryId: string }>) => new Set(receipts.map((receipt) => receipt.entryId));

const mailEntries = (agentId: string) =>
	readBoard(BoardScope.Agent({ agentId })).pipe(Effect.map((entries) => entries.filter((entry) => entry.kind === "mail")));

export const mail = Effect.fn("boards.mail")((input: MailInput) =>
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

export const unreadMail = Effect.fn("boards.unreadMail")(function* (agentId: string) {
	const db = yield* Database;
	const entries = yield* mailEntries(agentId);
	const read = readIds(yield* db.BoardEntryReceipt.where((receipt) => receipt.entryId.in(entries.map((entry) => entry.id))).select("entryId"));
	return entries.filter((entry) => !read.has(entry.id));
});

export const markMailRead = Effect.fn("boards.markMailRead")(function* (agentId: string, entryIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const entries = yield* mailEntries(agentId);
	const addressed = new Set(entries.map((entry) => entry.id));
	const requested = new Set(entryIds);
	const stray = [...requested].find((entryId) => !addressed.has(entryId));
	if (stray !== undefined) {
		return yield* new MailNotAddressed({ agentId, entryId: stray });
	}
	const read = readIds(yield* db.BoardEntryReceipt.where((receipt) => receipt.entryId.in([...requested])).select("entryId"));
	yield* Effect.forEach(
		[...requested].filter((entryId) => !read.has(entryId)),
		(entryId) => db.BoardEntryReceipt.create({ entryId }),
		{ discard: true },
	);
});
