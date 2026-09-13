import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Registry } from "#app.ts";
import { pendingMigrations, rewriteFacts } from "#migrate.ts";
import { replay } from "#replay.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";
import { applyUpgrades, pendingUpgrades, steps, type UpgradeStep } from "#upgrade.ts";

const JOURNAL = `CREATE TABLE IF NOT EXISTS "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;
const APPLIED = `CREATE TABLE IF NOT EXISTS "applied" ("requestId" TEXT PRIMARY KEY, "seq" INTEGER NOT NULL)`;
const SHAPES = `CREATE TABLE IF NOT EXISTS "shape" ("name" TEXT PRIMARY KEY, "hash" TEXT NOT NULL)`;
const CURSORS = `CREATE TABLE IF NOT EXISTS "runner_cursor" ("logId" TEXT PRIMARY KEY, "cursor" INTEGER NOT NULL, "seq" INTEGER NOT NULL)`;
const MIGRATIONS = `CREATE TABLE IF NOT EXISTS "fact_migration" ("feature" TEXT NOT NULL, "number" INTEGER NOT NULL, "at" INTEGER NOT NULL, PRIMARY KEY ("feature", "number"))`;

export const start = (
	sql: SqlClient,
	registry: Registry,
	backup: Effect.Effect<void> = Effect.void,
	upgrades: readonly UpgradeStep[] = steps,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		const known = yield* sql`SELECT "name" FROM sqlite_master WHERE "type" = 'table' AND "name" = 'shape'`;
		const stored = known.length === 0 ? [] : yield* sql`SELECT "name", "hash" FROM "shape"`;
		const upgrading = yield* pendingUpgrades(sql, upgrades);
		const pending = yield* pendingMigrations(sql, registry);
		const changed =
			registry.rows.some((row) => !stored.some((found) => found.name === row.name && found.hash === shapeOf(row))) ||
			stored.length !== registry.rows.length;
		const rebuilds = changed || pending.length > 0;
		if ((rebuilds || upgrading.length > 0) && stored.length > 0) yield* backup;
		yield* sql.withTransaction(
			Effect.gen(function* () {
				for (const statement of [JOURNAL, APPLIED, SHAPES, CURSORS, MIGRATIONS]) yield* sql.unsafe(statement);
				yield* applyUpgrades(sql, upgrading);
				const rewritten = yield* rewriteFacts(sql, pending);
				if (!rebuilds) return;
				for (const row of stored) yield* sql`DROP TABLE ${sql(String(row.name))}`;
				yield* sql`DELETE FROM "shape"`;
				yield* createTables(sql, registry);
				yield* replay(sql, registry, rewritten, () => {});
			}),
		);
	}).pipe(Effect.orDie);

const createTables = Effect.fn("journal.createTables")(function* (sql: SqlClient, registry: Registry) {
	for (const row of registry.rows) {
		yield* sql.unsafe(tableDdl(row));
		const index = indexDdl(row);
		if (index !== undefined) yield* sql.unsafe(index);
		yield* sql`INSERT INTO "shape" ${sql.insert({ name: row.name, hash: shapeOf(row) })}`;
	}
});
