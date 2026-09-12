import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Latch, Layer } from "effect";
import { expect } from "vitest";
import { Database, DataDirectory } from "#database.ts";
import * as Journal from "#journal.ts";

const directory = Layer.effect(
	DataDirectory,
	Effect.gen(function* () {
		const files = yield* FileSystem.FileSystem;
		return { path: yield* files.makeTempDirectoryScoped({ prefix: "antumbra-journal-" }) };
	}),
).pipe(Layer.provide(NodeFileSystem.layer), Layer.orDie);

const layer = Journal.file().pipe(Layer.provide(directory), Layer.provide(NodeFileSystem.layer));

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
