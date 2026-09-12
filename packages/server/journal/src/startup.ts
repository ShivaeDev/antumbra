import type { StoredFact } from "@antumbra/platform-feature/migration.ts";
import { Cause, Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Registry, RunnableMigration } from "#app.ts";
import { materialize } from "#materialize.ts";
import { pendingMigrations, rewriteFacts, storedFact } from "#migrate.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";

const JOURNAL = `CREATE TABLE IF NOT EXISTS "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL)`;
const APPLIED = `CREATE TABLE IF NOT EXISTS "applied" ("requestId" TEXT PRIMARY KEY, "seq" INTEGER NOT NULL)`;
const SHAPES = `CREATE TABLE IF NOT EXISTS "shape" ("name" TEXT PRIMARY KEY, "hash" TEXT NOT NULL)`;
const CURSORS = `CREATE TABLE IF NOT EXISTS "runner_cursor" ("logId" TEXT PRIMARY KEY, "cursor" INTEGER NOT NULL, "seq" INTEGER NOT NULL)`;
const MIGRATIONS = `CREATE TABLE IF NOT EXISTS "fact_migration" ("feature" TEXT NOT NULL, "number" INTEGER NOT NULL, "at" INTEGER NOT NULL, PRIMARY KEY ("feature", "number"))`;

export const start = (sql: SqlClient, registry: Registry, backup: Effect.Effect<void> = Effect.void): Effect.Effect<void> =>
	Effect.gen(function* () {
		const known = yield* sql`SELECT "name" FROM sqlite_master WHERE "type" = 'table' AND "name" = 'shape'`;
		const stored = known.length === 0 ? [] : yield* sql`SELECT "name", "hash" FROM "shape"`;
		const pending = yield* pendingMigrations(sql, registry);
		const changed =
			registry.rows.some((row) => !stored.some((found) => found.name === row.name && found.hash === shapeOf(row))) ||
			stored.length !== registry.rows.length;
		const rebuilds = changed || pending.length > 0;
		if (rebuilds && stored.length > 0) yield* backup;
		yield* sql.withTransaction(
			Effect.gen(function* () {
				for (const statement of [JOURNAL, APPLIED, SHAPES, CURSORS, MIGRATIONS]) yield* sql.unsafe(statement);
				const rewritten = yield* rewriteFacts(sql, pending);
				if (!rebuilds) return;
				for (const row of stored) yield* sql`DROP TABLE ${sql(String(row.name))}`;
				yield* sql`DELETE FROM "shape"`;
				yield* createTables(sql, registry);
				yield* replay(sql, registry, rewritten);
			}),
		);
	}).pipe(Effect.orDie);

const undecodable = (fact: StoredFact, migration: RunnableMigration | undefined): string =>
	migration === undefined
		? `the fact "${fact.name}" at seq ${fact.seq} does not decode`
		: `the fact "${fact.name}" at seq ${fact.seq} does not decode after fact migration ${migration.number} of "${migration.feature}"`;

const replay = Effect.fn("Journal.replay")(function* (sql: SqlClient, registry: Registry, rewritten: ReadonlyMap<number, RunnableMigration>) {
	const entries = yield* sql`SELECT "seq", "at", "requestId", "name", "payload" FROM "journal" ORDER BY "seq"`;
	for (const entry of entries) {
		const fact = yield* storedFact(entry);
		const source = registry.materializers.get(fact.name);
		if (source === undefined) return yield* Effect.die(new Error(`no materializer declares the fact "${fact.name}"`));
		const decoded = yield* Schema.decodeUnknownEffect(source.fact.Payload)(fact.payload).pipe(
			Effect.catchCause((cause) => Effect.die(new Error(`${undecodable(fact, rewritten.get(fact.seq))}: ${Cause.squash(cause)}`))),
		);
		yield* materialize(sql, registry, fact.name, { ...decoded, at: fact.at, requestId: fact.requestId, seq: fact.seq }, () => {});
	}
});

const createTables = Effect.fn("journal.createTables")(function* (sql: SqlClient, registry: Registry) {
	for (const row of registry.rows) {
		yield* sql.unsafe(tableDdl(row));
		const index = indexDdl(row);
		if (index !== undefined) yield* sql.unsafe(index);
		yield* sql`INSERT INTO "shape" ${sql.insert({ name: row.name, hash: shapeOf(row) })}`;
	}
});
