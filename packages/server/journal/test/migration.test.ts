import { feature } from "@antumbra/platform-feature/feature.ts";
import { type MigrationShape, migration } from "@antumbra/platform-feature/migration.ts";
import { it } from "@effect/vitest";
import { Cause, Effect } from "effect";
import { expect } from "vitest";
import { app, registryOf } from "#app.ts";
import { Database } from "#database.ts";
import { pieceChartered } from "#example/facts/piece-chartered.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { pieceCharteredMaterializer } from "#example/materializers/piece-chartered.ts";
import { pieceParkedMaterializer } from "#example/materializers/piece-parked.ts";
import { piece } from "#example/rows/piece.ts";
import * as Journal from "#journal.ts";
import { start } from "#startup.ts";

const JOURNAL = `CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;

const piecesWith = (migrations: readonly MigrationShape[]) =>
	feature("pieces", {
		rows: [piece],
		facts: [pieceChartered, pieceParked],
		migrations,
		commands: [],
		materializers: [pieceCharteredMaterializer, pieceParkedMaterializer],
		queries: [],
	});

const reasonRenamed = migration(1, {
	fact: "PieceParked",
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { pieceId: stored.payload.pieceId, reason: stored.payload.why } }),
});

const reasonTrimmed = migration(2, {
	fact: "PieceParked",
	rewrite: (stored) => {
		const reason = String(stored.payload.reason).trim();
		if (reason === "") return Effect.die(new Error(`the parked fact at seq ${stored.seq} carries no reason to keep`));
		return Effect.succeed({ ...stored, payload: { ...stored.payload, reason } });
	},
});

const reasonUnstrung = migration(1, {
	fact: "PieceParked",
	rewrite: (stored) => Effect.succeed({ ...stored, payload: { pieceId: stored.payload.pieceId, reason: 3 } }),
});

const factRenamed = migration(1, { fact: "PieceLaidUp", rewrite: (stored) => Effect.succeed({ ...stored, name: "PieceParked" }) });

const withdrawnDropped = migration(1, {
	fact: "PieceChartered",
	rewrite: (stored) => Effect.succeed(stored.payload.title === "withdrawn" ? undefined : stored),
});

const numberedThird = migration(3, { fact: "PieceParked", rewrite: (stored) => Effect.succeed(stored) });

const seeded = (...facts: readonly { readonly name: string; readonly payload: Record<string, unknown> }[]) =>
	Effect.gen(function* () {
		const { write: sql } = yield* Database;
		yield* sql.unsafe(JOURNAL);
		const entries: Record<string, unknown>[] = [];
		for (const fact of facts) {
			const seq = entries.length + 1;
			entries.push({ at: 100 + seq, name: fact.name, payload: JSON.stringify(fact.payload), requestId: `request-${seq}`, seq });
		}
		yield* sql`INSERT INTO "journal" ${sql.insert(entries)}`;
	}).pipe(Effect.orDie);

const startWith = (migrations: readonly MigrationShape[], backup: Effect.Effect<void> = Effect.void) =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* start(database.write, yield* registryOf(app([piecesWith(migrations)])), backup);
	});

const charterOf = (pieceId: string, title: string) => ({ name: "PieceChartered", payload: { pieceId, title, voyageId: "voyage-1" } });

it.effect("a migration renaming a payload field runs once and the replayed row carries the value", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* seeded(charterOf("piece-1", "read the chart"), { name: "PieceParked", payload: { pieceId: "piece-1", why: "waiting on review" } });
		yield* startWith([reasonRenamed]);
		expect(yield* database.read`SELECT "status", "parkedReason" FROM "piece"`).toEqual([{ status: "parked", parkedReason: "waiting on review" }]);
		expect(yield* database.read`SELECT "feature", "number" FROM "fact_migration"`).toEqual([{ feature: "pieces", number: 1 }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a migration renaming a fact makes its materializer run", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* seeded(charterOf("piece-1", "read the chart"), { name: "PieceLaidUp", payload: { pieceId: "piece-1", reason: "waiting on review" } });
		yield* startWith([factRenamed]);
		expect(yield* database.read`SELECT "status", "parkedReason" FROM "piece"`).toEqual([{ status: "parked", parkedReason: "waiting on review" }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a migration dropping a fact leaves no journal entry and no row", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* seeded(charterOf("piece-1", "read the chart"), charterOf("piece-2", "withdrawn"));
		yield* startWith([withdrawnDropped]);
		expect(yield* database.read`SELECT "seq" FROM "journal"`).toEqual([{ seq: 1 }]);
		expect(yield* database.read`SELECT "id" FROM "piece"`).toEqual([{ id: "piece-1" }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a second startup applies nothing and replays nothing", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const sql = database.write;
		yield* seeded(charterOf("piece-1", "read the chart"));
		yield* startWith([withdrawnDropped]);
		const recorded = yield* database.read`SELECT * FROM "fact_migration"`;
		const kept = { id: "piece-kept", parkedReason: null, status: "chartered", title: "written after the rebuild", voyageId: "voyage-1" };
		yield* sql`INSERT INTO "piece" ${sql.insert(kept)}`;
		yield* startWith([withdrawnDropped]);
		expect(yield* database.read`SELECT * FROM "fact_migration"`).toEqual(recorded);
		expect(yield* database.read`SELECT "id" FROM "piece" ORDER BY "id"`).toEqual([{ id: "piece-1" }, { id: "piece-kept" }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a failing migration rewrites no fact and records nothing", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* seeded(
			{ name: "PieceParked", payload: { pieceId: "piece-1", why: "  waiting on review  " } },
			{ name: "PieceParked", payload: { pieceId: "piece-2", why: "   " } },
		);
		yield* startWith([reasonRenamed]);
		const journal = yield* database.read`SELECT * FROM "journal" ORDER BY "seq"`;
		const recorded = yield* database.read`SELECT * FROM "fact_migration"`;
		const failure = yield* Effect.flip(Effect.sandbox(startWith([reasonRenamed, reasonTrimmed])));
		expect(String(Cause.squash(failure))).toContain("the parked fact at seq 2 carries no reason to keep");
		expect(yield* database.read`SELECT * FROM "journal" ORDER BY "seq"`).toEqual(journal);
		expect(yield* database.read`SELECT * FROM "fact_migration"`).toEqual(recorded);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a gap in the migration numbers refuses startup", () =>
	Effect.gen(function* () {
		const refusal = yield* Effect.flip(Effect.sandbox(registryOf(app([piecesWith([reasonRenamed, numberedThird])]))));
		expect(String(Cause.squash(refusal))).toBe('Error: the feature "pieces" declares fact migrations numbered 1, 3; they must be numbered 1, 2');
	}),
);

it.effect("a migrated payload the schema cannot decode names the fact, its seq, and the migration", () =>
	Effect.gen(function* () {
		yield* seeded(charterOf("piece-1", "read the chart"), { name: "PieceParked", payload: { pieceId: "piece-1", why: "waiting on review" } });
		const failure = yield* Effect.flip(Effect.sandbox(startWith([reasonUnstrung])));
		expect(String(Cause.squash(failure))).toContain('the fact "PieceParked" at seq 2 does not decode after fact migration 1 of "pieces"');
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);

it.effect("a pending migration takes the rebuild backup once", () =>
	Effect.gen(function* () {
		let taken = 0;
		const backup = Effect.sync(() => {
			taken += 1;
		});
		yield* seeded(charterOf("piece-1", "read the chart"));
		yield* startWith([], backup);
		expect(taken).toBe(0);
		yield* startWith([withdrawnDropped], backup);
		expect(taken).toBe(1);
		yield* startWith([withdrawnDropped], backup);
		expect(taken).toBe(1);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
