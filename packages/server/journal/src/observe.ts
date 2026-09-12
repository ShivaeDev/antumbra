import type { FactShape } from "@antumbra/platform-feature/fact.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { CommitContext } from "#commit.ts";
import { materialize } from "#materialize.ts";

export interface Observation<Payload> {
	readonly logId: string;
	readonly cursor: number;
	readonly at: number;
	readonly requestId: Request;
	readonly payload: Payload;
}

export const readCursor = (sql: SqlClient, logId: string): Effect.Effect<number> =>
	Effect.map(sql`SELECT "cursor" FROM "runner_cursor" WHERE "logId" = ${logId}`, (rows) => Number(rows[0]?.cursor ?? -1)).pipe(Effect.orDie);

export const observe = Effect.fn("journal.observe")(function* (
	context: CommitContext,
	fact: FactShape,
	observation: Observation<Record<string, unknown>>,
) {
	const sql = context.sql;
	const dirty = new Set<string>();
	const seq = yield* sql
		.withTransaction(
			Effect.gen(function* () {
				const previous = yield* sql`SELECT "cursor", "seq" FROM "runner_cursor" WHERE "logId" = ${observation.logId}`;
				if (Number(previous[0]?.cursor ?? -1) >= observation.cursor) return Number(previous[0]?.seq);
				const payload = yield* Schema.encodeUnknownEffect(fact.Payload)(observation.payload);
				const entry = { name: fact.name, payload: JSON.stringify(payload), at: observation.at, requestId: observation.requestId };
				const written = yield* sql`INSERT INTO "journal" ${sql.insert(entry)} RETURNING "seq"`;
				const seq = Number(written[0]?.seq);
				yield* materialize(
					sql,
					context.registry,
					fact.name,
					{ ...observation.payload, at: observation.at, requestId: observation.requestId, seq },
					(key) => dirty.add(key),
				);
				yield* sql`INSERT INTO "runner_cursor" ${sql.insert({ logId: observation.logId, cursor: observation.cursor, seq })} ON CONFLICT ("logId") DO UPDATE SET "cursor" = excluded."cursor", "seq" = excluded."seq"`;
				return seq;
			}),
		)
		.pipe(Effect.orDie);
	yield* context.reactivity.invalidate([...dirty]);
	return seq;
});
