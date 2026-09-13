import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { NodeFileSystem } from "@effect/platform-node";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { it } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Latch, Layer, Schema } from "effect";
import { expect } from "vitest";
import { app } from "#app.ts";
import { Commit } from "#commit.ts";
import { Database, DataDirectory } from "#database.ts";
import * as Journal from "#journal.ts";

const directory = Layer.effect(
	DataDirectory,
	Effect.gen(function* () {
		const files = yield* FileSystem.FileSystem;
		return { path: yield* files.makeTempDirectoryScoped({ prefix: "antumbra-journal-" }) };
	}),
).pipe(Layer.provide(NodeFileSystem.layer), Layer.orDie);

const layer = Journal.file().pipe(Layer.provideMerge(directory), Layer.provideMerge(NodeFileSystem.layer));

it.effect("file storage uses WAL and synchronous NORMAL", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const mode = yield* Effect.orDie(database.write`PRAGMA journal_mode`);
		const synchronous = yield* Effect.orDie(database.write`PRAGMA synchronous`);
		expect(mode[0]?.journal_mode).toBe("wal");
		expect(synchronous[0]?.synchronous).toBe(1);
	}).pipe(Effect.provide(layer), Effect.orDie),
);

it.effect("readers see committed values during an open write transaction", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* Effect.orDie(database.write`CREATE TABLE "note" ("id" TEXT PRIMARY KEY, "text" TEXT NOT NULL)`);
		yield* Effect.orDie(database.write`INSERT INTO "note" ("id", "text") VALUES ('one', 'committed')`);
		const inside = yield* Latch.make(false);
		const release = yield* Latch.make(false);
		const held = yield* Effect.forkChild(
			database.write.withTransaction(
				Effect.gen(function* () {
					yield* database.write`UPDATE "note" SET "text" = 'held' WHERE "id" = 'one'`;
					yield* inside.open;
					yield* release.await;
				}),
			),
		);
		yield* inside.await;
		const seen = yield* Effect.orDie(database.read`SELECT "text" FROM "note" WHERE "id" = 'one'`);
		expect(seen[0]?.text).toBe("committed");
		yield* release.open;
		yield* Effect.orDie(Fiber.join(held));
	}).pipe(Effect.provide(layer), Effect.orDie),
);

const note = row("note", { id: Schema.String, text: Schema.String }, { key: "id" });
const noted = fact("Noted", note.fields);
const addNote = command("add", { input: note.fields, reads: [], emits: noted, rejections: {}, run: (input) => Effect.succeed(input) });
const notes = feature("notes", {
	rows: [note],
	facts: [noted],
	commands: [addNote],
	queries: [],
	materializers: [materializer(noted, { writes: [note], run: (fact, rows) => rows.note.insert({ id: fact.id, text: fact.text }) })],
});

it.effect("manual rebuild keeps the previous journal and projections in a backup", () =>
	Effect.gen(function* () {
		const commit = yield* Commit;
		const directory = yield* DataDirectory;
		const files = yield* FileSystem.FileSystem;
		yield* commit.commit(addNote, { id: "one", text: "Keep this note", requestId: Request.make("one") });
		yield* commit.rebuild;
		const backups = yield* files.readDirectory(`${directory.path}/backups`);
		expect(backups).toHaveLength(1);
		const backup = yield* SqliteClient.make({ filename: `${directory.path}/backups/${backups[0]}`, readonly: true, disableWAL: true });
		expect(yield* backup`SELECT "text" FROM "note"`).toEqual([{ text: "Keep this note" }]);
		expect(yield* backup`SELECT "requestId" FROM "journal"`).toEqual([{ requestId: "one" }]);
	}).pipe(Effect.provide(Journal.layer(app([notes])).pipe(Layer.provideMerge(layer))), Effect.orDie),
);
