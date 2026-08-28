import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { MailNotAddressed } from "#errors.ts";
import { BoardScope, EntryInput, type MailInput } from "#model.ts";
import { readBoard } from "#read.ts";
import { writeEntry } from "#write.ts";

const mailbox = (agentId: string): BoardScope => BoardScope.Agent({ agentId });

const readIds = (receipts: ReadonlyArray<{ readonly entryId: string }>) =>
	new Set(receipts.map((receipt) => receipt.entryId));

const mailEntries = (agentId: string) =>
	readBoard(mailbox(agentId)).pipe(
		Effect.map((entries) => entries.filter((entry) => entry.kind === "mail")),
	);

const storeReceipt = (entryId: string) =>
	Database.use((db) =>
		db.BoardEntryReceipt.create({ entryId }).pipe(
			Effect.asVoid,
			Effect.catchTag("PrismaError", (failure) =>
				db.BoardEntryReceipt.where({ entryId })
					.exists()
					.pipe(
						Effect.flatMap((exists) =>
							exists ? Effect.void : Effect.fail(failure),
						),
					),
			),
		),
	);

export const mail = (input: MailInput) =>
	writeEntry(
		mailbox(input.toAgentId),
		EntryInput.Mail({
			authorAgentId: input.authorAgentId,
			body: input.body,
			precedence: input.precedence,
			register: "smooth",
			sourceRef: input.sourceRef,
		}),
	);

export const unreadMail = (agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const entries = yield* mailEntries(agentId);
		const read = readIds(yield* db.BoardEntryReceipt.select("entryId"));
		return entries.filter((entry) => !read.has(entry.id));
	});

export const markMailRead = (
	agentId: string,
	entryIds: ReadonlyArray<string>,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const entries = yield* mailEntries(agentId);
		const addressed = new Set(entries.map((entry) => entry.id));
		const requested = new Set(entryIds);
		const stray = [...requested].find((entryId) => !addressed.has(entryId));
		if (stray !== undefined) {
			return yield* new MailNotAddressed({ agentId, entryId: stray });
		}
		const read = readIds(yield* db.BoardEntryReceipt.select("entryId"));
		yield* Effect.forEach(
			[...requested].filter((entryId) => !read.has(entryId)),
			storeReceipt,
			{ discard: true },
		);
	});
