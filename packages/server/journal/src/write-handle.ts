import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { RowCodec } from "#codec.ts";
import { scopeKey, tableKey } from "#keys.ts";
import { keyed, type RuntimeRead, readHandle } from "#read-handle.ts";

export interface RuntimeWrite extends RuntimeRead {
	readonly delete: (key: unknown) => Effect.Effect<void>;
	readonly insert: (value: unknown) => Effect.Effect<void>;
	readonly update: (key: unknown, patch: Record<string, unknown>) => Effect.Effect<void>;
}

const scopeOf = (sql: SqlClient, codec: RowCodec, key: unknown): Effect.Effect<unknown> =>
	codec.row.scope === undefined
		? Effect.succeed(undefined)
		: Effect.flatMap(keyed(sql, codec, key), (where) => sql`SELECT * FROM ${sql(codec.row.name)} WHERE ${where} LIMIT 1`).pipe(
				Effect.map((found) => (codec.row.scope === undefined ? undefined : found[0]?.[codec.row.scope])),
				Effect.orDie,
			);

const mark = (codec: RowCodec, dirty: (key: string) => void, scope: unknown): void => {
	dirty(tableKey(codec.row.name));
	if (codec.row.scope !== undefined && scope !== undefined && scope !== null) {
		dirty(scopeKey(codec.row.name, scope));
	}
};

export const writeHandle = (sql: SqlClient, codec: RowCodec, dirty: (key: string) => void): RuntimeWrite => ({
	...readHandle(sql, codec),
	delete: (key) =>
		Effect.gen(function* () {
			mark(codec, dirty, yield* scopeOf(sql, codec, key));
			const where = yield* keyed(sql, codec, key);
			yield* Effect.orDie(sql`DELETE FROM ${sql(codec.row.name)} WHERE ${where}`);
		}),
	insert: (value) =>
		Effect.gen(function* () {
			const record = yield* codec.encodeRow(value);
			mark(codec, dirty, codec.row.scope === undefined ? undefined : record[codec.row.scope]);
			yield* Effect.orDie(sql`INSERT INTO ${sql(codec.row.name)} ${sql.insert(record)}`);
		}),
	update: (key, patch) =>
		Effect.gen(function* () {
			mark(codec, dirty, yield* scopeOf(sql, codec, key));
			const record = yield* Effect.forEach(Object.entries(patch), ([name, value]) =>
				Effect.map(codec.encodeField(name, value), (encoded) => [name, encoded] as const),
			);
			const changes = Object.fromEntries(record);
			if (codec.row.scope !== undefined && codec.row.scope in changes) {
				mark(codec, dirty, changes[codec.row.scope]);
			}
			const where = yield* keyed(sql, codec, key);
			yield* Effect.orDie(sql`UPDATE ${sql(codec.row.name)} SET ${sql.update(changes)} WHERE ${where}`);
		}),
});
