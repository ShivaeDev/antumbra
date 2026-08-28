import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { applyMigrations, Database } from "@antumbra/persistence";
import {
	packagedMigrationsDirectory,
	temporaryPersistence,
} from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { afterAll } from "vitest";
import { MailNotAddressed } from "#errors.ts";
import { markMailRead, unreadMail } from "#mailbox.ts";
import { BoardScope, EntryInput } from "#model.ts";
import { linkedBoardId } from "#owner.ts";
import { writeEntry } from "#write.ts";

const temporary = temporaryPersistence();
const observedRows: Array<Record<string, unknown>> = [];

afterAll(temporary.remove);

const databaseLayer = Database.layer({
	path: temporary.database,
	middleware: [
		{
			name: "observe-board-link-projection",
			onRow(row) {
				observedRows.push(row);
				return Promise.resolve();
			},
		},
	],
});
const boardsLayer = DomainFeedsLive.pipe(Layer.provideMerge(databaseLayer));

const rowsWith = (field: string, value: unknown) =>
	observedRows.filter((row) => row[field] === value);

it.effect("requests only the scalar fields consumed by Board lookups", () =>
	Effect.gen(function* () {
		yield* applyMigrations({
			database: temporary.database,
			migrationsDirectory: packagedMigrationsDirectory,
		});
		const db = yield* Database;
		yield* db.BoardOwner.create({
			boardId: "board-projection",
			ownerId: "agent-projection",
			ownerKind: "agent",
		});

		observedRows.length = 0;
		expect(
			yield* linkedBoardId(BoardScope.Agent({ agentId: "agent-projection" })),
		).toEqual(Option.some("board-projection"));
		const boardIdRows = rowsWith("boardId", "board-projection");

		yield* db.Agent.create({
			charter: "keep Board reads narrow",
			id: "agent-sequence-projection",
			role: "hand",
			status: "alive",
		});
		const sequenceScope = BoardScope.Agent({
			agentId: "agent-sequence-projection",
		});
		const note = (body: string) =>
			EntryInput.Note({
				authorAgentId: Option.none(),
				body,
				register: "rough",
			});
		yield* writeEntry(sequenceScope, note("first"));
		observedRows.length = 0;
		const second = yield* writeEntry(sequenceScope, note("second"));
		const sequenceRows = rowsWith("seq", 1);

		yield* db.Agent.create({
			charter: "read only addressed mail",
			id: "agent-receipt-projection",
			role: "hand",
			status: "alive",
		});
		const receiptAgentId = "agent-receipt-projection";
		const received = yield* writeEntry(
			BoardScope.Agent({ agentId: receiptAgentId }),
			EntryInput.Mail({
				authorAgentId: Option.none(),
				body: "inspect the scalar receipt",
				precedence: "routine",
				register: "smooth",
				sourceRef: "test:receipt-projection",
			}),
		);
		yield* db.BoardEntryReceipt.create({ entryId: "receipt-sentinel" });

		observedRows.length = 0;
		expect(
			(yield* unreadMail(receiptAgentId)).map((entry) => entry.id),
		).toEqual([received.id]);
		const unreadReceiptRows = rowsWith("entryId", "receipt-sentinel");

		const failure = yield* Effect.flip(
			markMailRead(receiptAgentId, [received.id, "mail-not-addressed"]),
		);
		expect(failure).toEqual(
			new MailNotAddressed({
				agentId: receiptAgentId,
				entryId: "mail-not-addressed",
			}),
		);
		expect(
			yield* db.BoardEntryReceipt.where({ entryId: received.id }).exists(),
		).toBe(false);

		observedRows.length = 0;
		yield* markMailRead(receiptAgentId, [received.id]);
		const markReceiptRows = rowsWith("entryId", "receipt-sentinel");

		expect(second.seq).toBe(2);
		expect({
			boardIdRows,
			markReceiptRows,
			sequenceRows,
			unreadReceiptRows,
		}).toEqual({
			boardIdRows: [{ boardId: "board-projection" }],
			markReceiptRows: [{ entryId: "receipt-sentinel" }],
			sequenceRows: [{ seq: 1 }],
			unreadReceiptRows: [{ entryId: "receipt-sentinel" }],
		});
		expect(
			yield* db.BoardEntryReceipt.where({ entryId: received.id }).exists(),
		).toBe(true);
		expect(yield* unreadMail(receiptAgentId)).toEqual([]);
	}).pipe(Effect.provide(boardsLayer)),
);
