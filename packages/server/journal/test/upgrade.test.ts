import { definition } from "@antumbra/app-testing/entry.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { NodeFileSystem } from "@effect/platform-node";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { it } from "@effect/vitest";
import { Effect, FileSystem, Layer, Schema } from "effect";
import { expect } from "vitest";
import { registryOf } from "#app.ts";
import { Database, DataDirectory } from "#database.ts";
import * as Journal from "#journal.ts";
import { start } from "#startup.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";

const previousCatalog = row(
	"backendCatalog",
	{ backend: Schema.String, failure: Schema.NullOr(Schema.String) },
	{ key: "backend", scope: "backend" },
);
const directory = Layer.effect(
	DataDirectory,
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return { path: yield* fs.makeTempDirectoryScoped({ prefix: "antumbra-upgrade-" }) };
	}),
).pipe(Layer.provideMerge(NodeFileSystem.layer), Layer.orDie);
const disk = Journal.file().pipe(Layer.provideMerge(directory));

const storedJournal = Effect.gen(function* () {
	const { write: sql } = yield* Database;
	yield* sql`CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;
	yield* sql`CREATE TABLE "applied" ("requestId" TEXT PRIMARY KEY, "seq" INTEGER NOT NULL)`;
	yield* sql`CREATE TABLE "shape" ("name" TEXT PRIMARY KEY, "hash" TEXT NOT NULL)`;
	for (const projection of [previousCatalog, count]) {
		yield* sql.unsafe(tableDdl(projection));
		const index = indexDdl(projection);
		if (index !== undefined) yield* sql.unsafe(index);
		yield* sql`INSERT INTO "shape" ${sql.insert({ name: projection.name, hash: shapeOf(projection) })}`;
	}
	yield* sql`INSERT INTO "journal" ${sql.insert([
		{
			seq: 7,
			at: 120,
			requestId: "catalog",
			name: "ModelsListed",
			payload: JSON.stringify({ backend: "claude", failure: null, models: [] }),
			subject: "claude",
		},
		{
			seq: 8,
			at: 130,
			requestId: "count",
			name: "CountSet",
			payload: JSON.stringify({ key: "maxParallelSessions", count: 9 }),
			subject: null,
		},
	])}`;
	yield* sql`INSERT INTO "applied" ${sql.insert([
		{ requestId: "catalog", seq: 7 },
		{ requestId: "count", seq: 8 },
	])}`;
	yield* sql`INSERT INTO "backendCatalog" ${sql.insert({ backend: "claude", failure: null })}`;
	yield* sql`INSERT INTO "count" ${sql.insert({ key: "maxParallelSessions", scope: "fleet", count: 9 })}`;
}).pipe(Effect.orDie);

it.effect("rebuilds a projection whose shape changed through production materializers and saves the database it replaced", () =>
	Effect.gen(function* () {
		yield* storedJournal;
		const database = yield* Database;
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* DataDirectory;
		const registry = yield* registryOf(definition);
		const before = yield* database.read`SELECT * FROM "journal" ORDER BY "seq"`;
		const applied = yield* database.read`SELECT * FROM "applied" ORDER BY "seq"`;
		yield* start(database.write, registry, database.backup);
		expect(yield* database.read`SELECT * FROM "journal" ORDER BY "seq"`).toEqual(before);
		expect(yield* database.read`SELECT * FROM "applied" ORDER BY "seq"`).toEqual(applied);
		expect(yield* database.read`SELECT * FROM "backendCatalog"`).toEqual([{ backend: "claude", failure: null, imageInput: null }]);
		expect(yield* database.read`SELECT "count" FROM "count" WHERE "key" = 'maxParallelSessions'`).toEqual([{ count: 9 }]);
		const backups = yield* fs.readDirectory(`${directory.path}/backups`);
		expect(backups).toHaveLength(1);
		const saved = yield* SqliteClient.make({ filename: `${directory.path}/backups/${backups[0]}`, readonly: true, disableWAL: true });
		expect(yield* saved`SELECT * FROM "journal" ORDER BY "seq"`).toEqual(before);
		expect(yield* saved`SELECT * FROM "backendCatalog"`).toEqual([{ backend: "claude", failure: null }]);
		yield* start(database.write, registry, database.backup);
		expect(yield* fs.readDirectory(`${directory.path}/backups`)).toEqual(backups);
	}).pipe(Effect.provide(disk), Effect.orDie),
);

it.effect("a fresh journal creates no rebuild backup", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const fs = yield* FileSystem.FileSystem;
		const directory = yield* DataDirectory;
		yield* start(database.write, yield* registryOf(definition), database.backup);
		expect(yield* fs.exists(`${directory.path}/backups`)).toBe(false);
	}).pipe(Effect.provide(disk), Effect.orDie),
);
