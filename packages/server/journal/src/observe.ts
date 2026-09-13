import type { FactPayload, FactShape } from "@antumbra/platform-feature/fact.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect, Schema } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { CommitContext } from "#commit.ts";
import { materialize } from "#materialize.ts";
import { repeatOf, subjectOf } from "#repeat.ts";

export interface ObservationMetadata {
	readonly logId: string;
	readonly cursor: number;
	readonly at: number;
	readonly requestId: Request;
}

export interface Observation<Payload> extends ObservationMetadata {
	readonly payload: Payload;
}

export interface ObservedFact {
	readonly fact: FactShape;
	readonly payload: unknown;
}

export const observation = <Fact extends FactShape>(fact: Fact, payload: FactPayload<Fact>): ObservedFact => ({ fact, payload });

export const readCursor = (sql: SqlClient, logId: string): Effect.Effect<number> =>
	Effect.map(sql`SELECT "cursor" FROM "runner_cursor" WHERE "logId" = ${logId}`, (rows) => Number(rows[0]?.cursor ?? -1)).pipe(Effect.orDie);

const store = Effect.fn("journal.storeObserved")(function* (
	context: CommitContext,
	record: ObservationMetadata,
	entry: ObservedFact,
	dirty: (key: string) => void,
) {
	const sql = context.sql;
	const encoded = yield* Schema.encodeUnknownEffect(entry.fact.Payload)(entry.payload);
	const payload = JSON.stringify(encoded);
	const subject = yield* subjectOf(entry.fact, encoded);
	if ((yield* repeatOf(sql, entry.fact, subject, payload)) !== undefined) return undefined;
	const requestId = record.requestId;
	const written =
		yield* sql`INSERT INTO "journal" ${sql.insert({ name: entry.fact.name, payload, at: record.at, requestId, subject })} RETURNING "seq"`;
	const seq = Number(written[0]?.seq);
	yield* materialize(sql, context.registry, entry.fact.name, Object.assign({}, entry.payload, { at: record.at, requestId, seq }), dirty);
	return seq;
});

export const observeBatch = Effect.fn("journal.observeBatch")(function* (
	context: CommitContext,
	observation: ObservationMetadata,
	entries: readonly ObservedFact[],
) {
	const sql = context.sql;
	const dirty = new Set<string>();
	const seq = yield* sql
		.withTransaction(
			Effect.gen(function* () {
				const previous = yield* sql`SELECT "cursor", "seq" FROM "runner_cursor" WHERE "logId" = ${observation.logId}`;
				if (Number(previous[0]?.cursor ?? -1) >= observation.cursor) return Number(previous[0]?.seq);
				const latest = yield* sql`SELECT coalesce(max("seq"), 0) AS "seq" FROM "journal"`;
				let seq = Number(latest[0]?.seq);
				for (const entry of entries) {
					const stored = yield* store(context, observation, entry, (key) => dirty.add(key));
					if (stored !== undefined) seq = stored;
				}
				yield* sql`INSERT INTO "runner_cursor" ${sql.insert({ logId: observation.logId, cursor: observation.cursor, seq })} ON CONFLICT ("logId") DO UPDATE SET "cursor" = excluded."cursor", "seq" = excluded."seq"`;
				return seq;
			}),
		)
		.pipe(Effect.orDie);
	yield* context.reactivity.invalidate([...dirty]);
	return seq;
});

export const observe = (context: CommitContext, fact: FactShape, entry: Observation<unknown>): Effect.Effect<number> =>
	observeBatch(context, entry, [observation(fact, entry.payload)]);
