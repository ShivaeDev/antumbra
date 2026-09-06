import { RowNotFound } from "@antumbra/journal";
import { Effect, Option } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { Row } from "effect/unstable/sql/SqlConnection";
import type { Fragment } from "effect/unstable/sql/Statement";
import type { RowCodec } from "#codec.ts";

export interface RuntimeRead {
	readonly count: (match: Record<string, unknown>) => Effect.Effect<number>;
	readonly exists: (key: unknown) => Effect.Effect<boolean>;
	readonly find: (key: unknown) => Effect.Effect<Option.Option<unknown>>;
	readonly get: (key: unknown) => Effect.Effect<unknown>;
	readonly where: (match: Record<string, unknown>) => Effect.Effect<readonly unknown[]>;
}

export const conditions = (sql: SqlClient, codec: RowCodec, match: Record<string, unknown>): Effect.Effect<Fragment | undefined> =>
	Effect.map(
		Effect.forEach(Object.entries(match), ([name, value]) => Effect.map(codec.encodeField(name, value), (encoded) => sql`${sql(name)} = ${encoded}`)),
		(clauses) => (clauses.length === 0 ? undefined : sql.and(clauses)),
	);

const selectAll = (sql: SqlClient, codec: RowCodec, match: Record<string, unknown>): Effect.Effect<readonly Row[]> =>
	Effect.flatMap(conditions(sql, codec, match), (where) =>
		where === undefined ? sql`SELECT * FROM ${sql(codec.row.name)}` : sql`SELECT * FROM ${sql(codec.row.name)} WHERE ${where}`,
	).pipe(Effect.orDie);

export const keyed = (sql: SqlClient, codec: RowCodec, key: unknown): Effect.Effect<Fragment> =>
	Effect.map(codec.encodeField(codec.row.key, key), (encoded) => sql`${sql(codec.row.key)} = ${encoded}`);

const byKey = (sql: SqlClient, codec: RowCodec, key: unknown): Effect.Effect<Row | undefined> =>
	Effect.flatMap(keyed(sql, codec, key), (where) => sql`SELECT * FROM ${sql(codec.row.name)} WHERE ${where} LIMIT 1`).pipe(
		Effect.map((found) => found[0]),
		Effect.orDie,
	);

const counted = (sql: SqlClient, codec: RowCodec, match: Record<string, unknown>): Effect.Effect<number> =>
	Effect.flatMap(conditions(sql, codec, match), (where) =>
		where === undefined
			? sql`SELECT count(*) AS n FROM ${sql(codec.row.name)}`
			: sql`SELECT count(*) AS n FROM ${sql(codec.row.name)} WHERE ${where}`,
	).pipe(
		Effect.map((found) => Number(found[0]?.n ?? 0)),
		Effect.orDie,
	);

export const readHandle = (sql: SqlClient, codec: RowCodec): RuntimeRead => ({
	count: (match) => counted(sql, codec, match),
	exists: (key) => Effect.map(byKey(sql, codec, key), (found) => found !== undefined),
	find: (key) =>
		Effect.flatMap(byKey(sql, codec, key), (found) =>
			found === undefined ? Effect.succeed(Option.none()) : Effect.map(codec.decodeRow(found), Option.some),
		),
	get: (key) =>
		Effect.flatMap(byKey(sql, codec, key), (found) =>
			found === undefined ? Effect.die(new RowNotFound({ key: String(key), row: codec.row.name })) : codec.decodeRow(found),
		),
	where: (match) => Effect.flatMap(selectAll(sql, codec, match), (found) => Effect.forEach(found, codec.decodeRow)),
});
