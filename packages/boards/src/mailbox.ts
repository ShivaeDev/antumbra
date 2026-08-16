import { Database, Writer } from "@antumbra/persistence";
import { Effect } from "effect";
import { MailNotAddressed } from "#errors.ts";
import type { BoardScope, MailInput } from "#model.ts";
import { readBoard } from "#read.ts";
import { writeEntry } from "#write.ts";

const mailbox = (agentId: string): BoardScope => ({ agentId, kind: "agent" });

const readIds = (receipts: ReadonlyArray<{ readonly entryId: string }>) =>
	new Set(receipts.map((receipt) => receipt.entryId));

const mailEntries = (agentId: string) =>
	readBoard(mailbox(agentId)).pipe(
		Effect.map((entries) => entries.filter((entry) => entry.kind === "mail")),
	);

export const mail = (input: MailInput) =>
	writeEntry(mailbox(input.toAgentId), {
		authorAgentId: input.authorAgentId,
		body: input.body,
		kind: "mail",
		precedence: input.precedence,
		register: "smooth",
		sourceRef: input.sourceRef,
	});

export const unreadMail = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const entries = yield* mailEntries(agentId);
		const read = readIds(yield* db.BoardEntryReceipt.all());
		return entries.filter((entry) => !read.has(entry.id));
	});

export const markMailRead = (
	agentId: string,
	entryIds: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
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
				const read = readIds(yield* db.BoardEntryReceipt.all());
				yield* Effect.forEach(
					[...requested].filter((entryId) => !read.has(entryId)),
					(entryId) => db.BoardEntryReceipt.create({ entryId }),
				);
			}),
		);
	});
