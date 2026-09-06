import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Registry } from "#app.ts";
import { TableShapeChanged } from "#errors.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";

const JOURNAL = `CREATE TABLE IF NOT EXISTS "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL)`;

const APPLIED = `CREATE TABLE IF NOT EXISTS "applied" ("requestId" TEXT PRIMARY KEY, "seq" INTEGER NOT NULL)`;

const SHAPES = `CREATE TABLE IF NOT EXISTS "shape" ("name" TEXT PRIMARY KEY, "hash" TEXT NOT NULL)`;

const ensureTable = Effect.fn("journal.ensureTable")(function* (sql: SqlClient, row: Registry["rows"][number]) {
	const expected = shapeOf(row);
	const found = yield* sql`SELECT "hash" FROM "shape" WHERE "name" = ${row.name}`;
	const stored = found[0]?.hash;
	if (stored === undefined) {
		yield* sql.unsafe(tableDdl(row));
		const index = indexDdl(row);
		if (index !== undefined) yield* sql.unsafe(index);
		yield* sql`INSERT INTO "shape" ${sql.insert({ hash: expected, name: row.name })}`;
		return;
	}
	if (stored !== expected) {
		return yield* Effect.fail(new TableShapeChanged({ expected, stored: String(stored), table: row.name }));
	}
});

export const start = (sql: SqlClient, registry: Registry): Effect.Effect<void, TableShapeChanged> =>
	sql
		.withTransaction(
			Effect.gen(function* () {
				for (const statement of [JOURNAL, APPLIED, SHAPES]) {
					yield* sql.unsafe(statement);
				}
				yield* Effect.forEach(registry.rows, (row) => ensureTable(sql, row), { discard: true });
			}),
		)
		.pipe(Effect.catchTag("SqlError", Effect.die));
