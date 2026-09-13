import { fileURLToPath } from "node:url";
import { definition } from "@antumbra/app-testing/entry.ts";
import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, FileSystem, Layer } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { expect } from "vitest";
import { app, registryOf } from "#app.ts";
import { Database, DataDirectory } from "#database.ts";
import * as Journal from "#journal.ts";
import { start } from "#startup.ts";
import type { UpgradeStep } from "#upgrade.ts";

const directory = Layer.effect(
	DataDirectory,
	Effect.gen(function* () {
		const files = yield* FileSystem.FileSystem;
		return { path: yield* files.makeTempDirectoryScoped({ prefix: "antumbra-fixed-tables-" }) };
	}),
).pipe(Layer.provideMerge(NodeFileSystem.layer), Layer.orDie);
const disk = Journal.file().pipe(Layer.provideMerge(directory));

const olderFile = fileURLToPath(new URL("fixtures/pre-subject.sql", import.meta.url));

const storedUnderTheOlderShape = Effect.gen(function* () {
	const { write: sql } = yield* Database;
	const files = yield* FileSystem.FileSystem;
	const dumped = yield* files.readFileString(olderFile);
	for (const statement of dumped.split(";\n")) {
		if (statement.trim() !== "") yield* sql.unsafe(statement);
	}
}).pipe(Effect.orDie);

const facts = `SELECT "seq", "at", "requestId", "name", "payload" FROM "journal" ORDER BY "seq"`;

it.effect("an older journal file gains the subject column and its index, keeps its facts, and upgrades once", () =>
	Effect.gen(function* () {
		yield* storedUnderTheOlderShape;
		const database = yield* Database;
		const files = yield* FileSystem.FileSystem;
		const data = yield* DataDirectory;
		const registry = yield* registryOf(definition);
		const before = yield* database.read.unsafe(facts);
		yield* start(database.write, registry, database.backup);
		expect(yield* database.read.unsafe(facts)).toEqual(before);
		expect(yield* database.read`SELECT "subject" FROM "journal" ORDER BY "seq"`).toEqual([{ subject: null }, { subject: null }, { subject: null }]);
		expect(yield* database.read`SELECT "name" FROM sqlite_master WHERE "type" = 'index' AND "name" = 'journal_subject'`).toEqual([
			{ name: "journal_subject" },
		]);
		expect(yield* database.read`SELECT "key", "count" FROM "count" ORDER BY "key"`).toEqual([
			{ key: "idleSiestaMinutes", count: 45 },
			{ key: "maxParallelSessions", count: 9 },
		]);
		expect(yield* database.read`SELECT "key" FROM "flag"`).toEqual([{ key: "signChanges" }]);
		expect(yield* database.read`PRAGMA user_version`).toEqual([{ user_version: 1 }]);
		const backups = yield* files.readDirectory(`${data.path}/backups`);
		expect(backups).toHaveLength(1);
		yield* start(database.write, registry, database.backup);
		expect(yield* files.readDirectory(`${data.path}/backups`)).toEqual(backups);
		expect(yield* database.read`PRAGMA user_version`).toEqual([{ user_version: 1 }]);
	}).pipe(Effect.provide(disk), Effect.orDie),
);

const keepsake = Effect.gen(function* () {
	const { write: sql } = yield* Database;
	yield* sql`CREATE TABLE "keepsake" ("id" TEXT, "reason" TEXT)`;
	yield* sql`INSERT INTO "keepsake" ("id", "reason") VALUES ('one', 'kept'), ('two', 'also kept')`;
}).pipe(Effect.orDie);

const keepsakeRecreated: UpgradeStep = {
	number: 1,
	apply: Effect.fn("test.keepsakeRecreated")(function* (sql: SqlClient) {
		const columns = yield* sql`SELECT "name" FROM pragma_table_info('keepsake')`;
		if (!columns.some((column) => column.name === "reason")) return;
		yield* sql`CREATE TABLE "keepsake_upgraded" ("id" TEXT PRIMARY KEY, "note" TEXT NOT NULL)`;
		yield* sql`INSERT INTO "keepsake_upgraded" ("id", "note") SELECT "id", "reason" FROM "keepsake"`;
		yield* sql`DROP TABLE "keepsake"`;
		yield* sql`ALTER TABLE "keepsake_upgraded" RENAME TO "keepsake"`;
	}),
};

const keepsakeRefused: UpgradeStep = {
	number: 1,
	apply: Effect.fn("test.keepsakeRefused")(function* (sql: SqlClient) {
		yield* sql`INSERT INTO "keepsake" ("id", "reason") VALUES ('three', 'never kept')`;
		yield* sql`CREATE INDEX "keepsake_by_note" ON "keepsake" ("note")`;
	}),
};

const kept = [
	{ id: "one", note: "kept" },
	{ id: "two", note: "also kept" },
];

it.effect("a step that recreates a table copies its rows into the new shape and leaves it alone once recorded", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* keepsake;
		const registry = yield* registryOf(app([]));
		yield* start(database.write, registry, Effect.void, [keepsakeRecreated]);
		expect(yield* database.read`SELECT "id", "note" FROM "keepsake" ORDER BY "id"`).toEqual(kept);
		expect(yield* database.read`PRAGMA user_version`).toEqual([{ user_version: 1 }]);
		yield* database.write`INSERT INTO "keepsake" ${database.write.insert({ id: "three", note: "written after the upgrade" })}`;
		yield* start(database.write, registry, Effect.void, [keepsakeRecreated]);
		expect(yield* database.read`SELECT "id", "note" FROM "keepsake" ORDER BY "id"`).toEqual([
			{ id: "one", note: "kept" },
			{ id: "three", note: "written after the upgrade" },
			{ id: "two", note: "also kept" },
		]);
		expect(yield* database.read`PRAGMA user_version`).toEqual([{ user_version: 1 }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a failing step writes nothing and stops startup", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* keepsake;
		const registry = yield* registryOf(app([]));
		yield* Effect.flip(Effect.sandbox(start(database.write, registry, Effect.void, [keepsakeRefused])));
		expect(yield* database.read`SELECT "id" FROM "keepsake" ORDER BY "id"`).toEqual([{ id: "one" }, { id: "two" }]);
		expect(yield* database.read`SELECT "name" FROM sqlite_master WHERE "name" = 'journal'`).toEqual([]);
		expect(yield* database.read`PRAGMA user_version`).toEqual([{ user_version: 0 }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
