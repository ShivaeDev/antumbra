import type { StoredFact } from "@antumbra/platform-feature/migration.ts";
import { Clock, Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Row } from "effect/unstable/sql/SqlConnection";
import type { Registry, RunnableMigration } from "#app.ts";

const Payload = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

const recorded = (feature: string, number: number): string => `${feature}/${number}`;

export const storedFact = (entry: Row): Effect.Effect<StoredFact> =>
	Schema.decodeUnknownEffect(Payload)(entry.payload).pipe(
		Effect.map((payload) => ({
			at: Number(entry.at),
			name: String(entry.name),
			payload,
			requestId: String(entry.requestId),
			seq: Number(entry.seq),
		})),
		Effect.orDie,
	);

export const pendingMigrations = Effect.fn("journal.pendingMigrations")(function* (sql: SqlClient, registry: Registry) {
	const known = yield* sql`SELECT "name" FROM sqlite_master WHERE "type" = 'table' AND "name" = 'fact_migration'`;
	const rows = known.length === 0 ? [] : yield* sql`SELECT "feature", "number" FROM "fact_migration"`;
	const applied = new Set<string>();
	for (const row of rows) applied.add(recorded(String(row.feature), Number(row.number)));
	const pending: RunnableMigration[] = [];
	for (const migration of registry.migrations) {
		if (!applied.has(recorded(migration.feature, migration.number))) pending.push(migration);
	}
	return pending;
});

export const rewriteFacts = Effect.fn("journal.rewriteFacts")(function* (sql: SqlClient, pending: readonly RunnableMigration[]) {
	const rewritten = new Map<number, RunnableMigration>();
	const at = yield* Clock.currentTimeMillis;
	for (const migration of pending) {
		const entries = yield* sql`SELECT "seq", "at", "requestId", "name", "payload" FROM "journal" WHERE "name" = ${migration.fact} ORDER BY "seq"`;
		for (const entry of entries) {
			const stored = yield* storedFact(entry);
			const kept = yield* migration.rewrite(stored);
			if (kept === undefined) {
				yield* sql`DELETE FROM "journal" WHERE "seq" = ${stored.seq}`;
				continue;
			}
			const changes = { at: kept.at, name: kept.name, payload: JSON.stringify(kept.payload), requestId: kept.requestId };
			yield* sql`UPDATE "journal" SET ${sql.update(changes)} WHERE "seq" = ${stored.seq}`;
			rewritten.set(stored.seq, migration);
		}
		yield* sql`INSERT INTO "fact_migration" ${sql.insert({ at, feature: migration.feature, number: migration.number })}`;
	}
	return rewritten;
});
