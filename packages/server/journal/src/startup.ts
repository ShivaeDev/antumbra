import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Registry } from "#app.ts";
import { materialize } from "#materialize.ts";
import { indexDdl, shapeOf, tableDdl } from "#table.ts";

const JOURNAL = `CREATE TABLE IF NOT EXISTS "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL)`;
const APPLIED = `CREATE TABLE IF NOT EXISTS "applied" ("requestId" TEXT PRIMARY KEY, "seq" INTEGER NOT NULL)`;
const SHAPES = `CREATE TABLE IF NOT EXISTS "shape" ("name" TEXT PRIMARY KEY, "hash" TEXT NOT NULL)`;
const CURSORS = `CREATE TABLE IF NOT EXISTS "runner_cursor" ("logId" TEXT PRIMARY KEY, "cursor" INTEGER NOT NULL, "seq" INTEGER NOT NULL)`;
const Payload = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

export const start = (sql: SqlClient, registry: Registry): Effect.Effect<void> =>
	sql
		.withTransaction(
			Effect.gen(function* () {
				for (const statement of [JOURNAL, APPLIED, SHAPES, CURSORS]) yield* sql.unsafe(statement);
				const stored = yield* sql`SELECT "name", "hash" FROM "shape"`;
				const changed =
					registry.rows.some((row) => !stored.some((found) => found.name === row.name && found.hash === shapeOf(row))) ||
					stored.length !== registry.rows.length;
				if (!changed) return;
				for (const row of stored) yield* sql`DROP TABLE ${sql(String(row.name))}`;
				yield* sql`DELETE FROM "shape"`;
				yield* createTables(sql, registry);
				const entries = yield* sql`SELECT "seq", "at", "requestId", "name", "payload" FROM "journal" ORDER BY "seq"`;
				for (const entry of entries) {
					const payload = yield* Schema.decodeUnknownEffect(Payload)(entry.payload);
					const source = registry.materializers.get(String(entry.name));
					if (source === undefined) return yield* Effect.die(new Error(`no materializer declares the fact "${String(entry.name)}"`));
					const decoded = yield* Schema.decodeUnknownEffect(source.fact.Payload)(payload);
					yield* materialize(
						sql,
						registry,
						String(entry.name),
						{ ...decoded, at: Number(entry.at), seq: Number(entry.seq), requestId: String(entry.requestId) },
						() => {},
					);
				}
			}),
		)
		.pipe(Effect.orDie);

const createTables = Effect.fn("journal.createTables")(function* (sql: SqlClient, registry: Registry) {
	for (const row of registry.rows) {
		yield* sql.unsafe(tableDdl(row));
		const index = indexDdl(row);
		if (index !== undefined) yield* sql.unsafe(index);
		yield* sql`INSERT INTO "shape" ${sql.insert({ name: row.name, hash: shapeOf(row) })}`;
	}
});
