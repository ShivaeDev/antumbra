import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Fiber, FileSystem, Latch, Layer } from "effect";
import { expect } from "vitest";
import { Database, DataDirectory } from "#database.ts";
import * as Journal from "#journal.ts";
import { launched, pieceApp, pieceId } from "#test/kit.ts";
import { kit } from "#testing/kit.ts";

const directory = Layer.effect(
	DataDirectory,
	Effect.gen(function* () {
		const files = yield* FileSystem.FileSystem;
		return { path: yield* files.makeTempDirectoryScoped({ prefix: "antumbra-journal-" }) };
	}),
).pipe(Layer.provide(NodeFileSystem.layer), Layer.orDie);

const layer = Layer.provideMerge(Journal.layer(pieceApp), Journal.file()).pipe(Layer.provide(directory));

it.effect("the file-backed journal runs in write-ahead logging with synchronous NORMAL", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const mode = yield* Effect.orDie(database.write`PRAGMA journal_mode`);
		const synchronous = yield* Effect.orDie(database.write`PRAGMA synchronous`);
		expect(mode[0]?.journal_mode).toBe("wal");
		expect(synchronous[0]?.synchronous).toBe(1);
	}).pipe(Effect.provide(layer), Effect.orDie),
);

it.effect("the read-only client sees a committed row and reads on while a transaction is open", () =>
	Effect.gen(function* () {
		const parts = yield* kit(pieceApp);
		const database = yield* Database;
		yield* parts.seed.piece(launched(1));
		yield* parts.commit.pieces.park({ pieceId: pieceId(1), reason: "blocked on review" });
		expect((yield* parts.rows.piece.get(pieceId(1))).status).toBe("parked");
		const inside = yield* Latch.make(false);
		const release = yield* Latch.make(false);
		const held = yield* Effect.forkChild(
			database.write.withTransaction(
				Effect.gen(function* () {
					yield* database.write`UPDATE "piece" SET "title" = 'held' WHERE "id" = ${pieceId(1)}`;
					yield* inside.open;
					yield* release.await;
				}),
			),
		);
		yield* inside.await;
		const seen = yield* Effect.orDie(database.read`SELECT "title" FROM "piece" WHERE "id" = ${pieceId(1)}`);
		expect(seen[0]?.title).toBe("Piece 1");
		yield* release.open;
		yield* Effect.orDie(Fiber.join(held));
	}).pipe(Effect.provide(layer), Effect.orDie),
);
