import { registryOf } from "@antumbra/server-journal/app.ts";
import { Database } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { start } from "@antumbra/server-journal/startup.ts";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { definition } from "#definition.ts";

const JOURNAL = `CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;

const stored = (...held: readonly { readonly key: string; readonly on: boolean }[]) =>
	Effect.gen(function* () {
		const { write: sql } = yield* Database;
		yield* sql.unsafe(JOURNAL);
		yield* sql`INSERT INTO "journal" ${sql.insert(
			held.map((flag, index) => ({
				at: 100 + index,
				name: "FlagSet",
				payload: JSON.stringify(flag),
				requestId: `request-${index}`,
				seq: index + 1,
			})),
		)}`;
	}).pipe(Effect.orDie);

const booted = Effect.gen(function* () {
	const database = yield* Database;
	yield* start(database.write, yield* registryOf(definition));
	return yield* database.read<{ readonly key: string; readonly on: string }>`SELECT "key", "on" FROM "flag" ORDER BY "key"`;
});

it.effect("a database that held piece dispatch and wakes boots with those switches off", () =>
	Effect.gen(function* () {
		yield* stored({ key: "holdPieceDispatch", on: true }, { key: "holdWakes", on: true });
		expect(yield* booted).toEqual([
			{ key: "resumePieces", on: "false" },
			{ key: "spawnForPiece", on: "false" },
			{ key: "wakeOnFlashMail", on: "false" },
			{ key: "wakeOnHail", on: "false" },
			{ key: "wakeOnPriorityMail", on: "false" },
			{ key: "wakeOnRoutineMail", on: "false" },
		]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a database that held neither boots with every switch on, and other flags keep their value", () =>
	Effect.gen(function* () {
		yield* stored({ key: "holdPieceDispatch", on: false }, { key: "holdWakes", on: false }, { key: "retireSweep", on: false });
		expect(yield* booted).toEqual([
			{ key: "resumePieces", on: "true" },
			{ key: "retireSweep", on: "false" },
			{ key: "spawnForPiece", on: "true" },
			{ key: "wakeOnFlashMail", on: "true" },
			{ key: "wakeOnHail", on: "true" },
			{ key: "wakeOnPriorityMail", on: "true" },
			{ key: "wakeOnRoutineMail", on: "true" },
		]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a database that stored the pull request signature boots with no trace of it", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* stored({ key: "signChanges", on: false }, { key: "retireSweep", on: false });
		expect(yield* booted).toEqual([{ key: "retireSweep", on: "false" }]);
		expect(yield* database.read`SELECT "payload" FROM "journal" ORDER BY "seq"`).toEqual([
			{ payload: JSON.stringify({ keys: ["retireSweep"], on: false }) },
		]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
