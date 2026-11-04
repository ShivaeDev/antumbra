import type { Fields } from "@antumbra/platform-feature/fields.ts";
import type { ReadRows, WriteRows } from "@antumbra/platform-feature/handles.ts";
import { RowNotFound } from "@antumbra/platform-feature/rejection.ts";
import type { RowDefinition } from "@antumbra/platform-feature/row.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Option, Schema } from "effect";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";

export const rowsOf = Effect.fn("Postgres.rowsOf")(function* <
	Name extends string,
	Of extends Fields,
	Key extends keyof Of & string,
	Scope extends (keyof Of & string) | undefined,
>(row: RowDefinition<Name, Of, Key, Scope>, table: string, order = "storage_order") {
	const sql = yield* SqlClient.SqlClient;
	const reactivity = yield* Reactivity.Reactivity;
	const announce = (keys: readonly string[]) =>
		invalidateOnCommit(keys).pipe(Effect.provideService(SqlClient.SqlClient, sql), Effect.provideService(Reactivity.Reactivity, reactivity));
	type Value = typeof row.Row.Type;
	type Id = Value[Key & keyof Value];
	const select = (match: Partial<Value>) =>
		Effect.gen(function* () {
			const clauses = Object.entries(match).map(([key, value]) => (value === null ? sql`${sql(key)} is null` : sql`${sql(key)} = ${encode(value)}`));
			return yield* sql`select * from ${sql(`antumbra.${table}`)} where ${clauses.length === 0 ? sql`true` : sql.and(clauses)} order by ${sql(order)}`.pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(row.Row))),
				Effect.orDie,
			);
		});
	const byId = (id: Id) =>
		Effect.gen(function* () {
			const values = yield* sql`select * from ${sql(`antumbra.${table}`)} where ${sql(row.key)} = ${id}`.pipe(
				Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(row.Row))),
				Effect.orDie,
			);
			return Option.fromUndefinedOr(values[0]);
		});
	const reads: ReadRows<Value, Id> = {
		where: select,
		find: byId,
		exists: (id) => Effect.map(byId(id), Option.isSome),
		count: (match) => Effect.map(select(match), (values) => values.length),
		get: (id) =>
			Effect.flatMap(
				byId(id),
				Option.match({ onNone: () => Effect.die(new RowNotFound({ key: String(id), row: row.name })), onSome: Effect.succeed }),
			),
	};
	const mark = (value: Value) => {
		const scope = Object.entries(value).find(([key]) => key === row.scope)?.[1];
		return announce(scope === undefined || scope === null ? [row.name] : [row.name, `${row.name}:${scope}`]);
	};
	const writes: WriteRows<Value, Id> = {
		...reads,
		insert: (value) =>
			Effect.gen(function* () {
				const encoded = yield* Schema.encodeEffect(row.Row)(value).pipe(Effect.orDie);
				yield* sql`insert into ${sql(`antumbra.${table}`)} ${sql.insert(Object.fromEntries(Object.entries(encoded).map(([key, field]) => [key, encode(field)])))}`.pipe(
					Effect.orDie,
				);
				yield* mark(value).pipe(Effect.orDie);
			}),
		update: (id, patch) =>
			Effect.gen(function* () {
				const before = yield* reads.get(id);
				const fields = Object.entries(patch).map(([key, value]) => [key, encode(value)] as const);
				const changed = fields.map(([key, value]) => sql`${sql(key)} is distinct from ${value}`);
				yield* sql`update ${sql(`antumbra.${table}`)} set ${sql.update(Object.fromEntries(fields))} where ${sql(row.key)} = ${id} and ${sql.or(changed)}`.pipe(
					Effect.orDie,
				);
				yield* mark(before).pipe(Effect.orDie);
				if (row.scope !== undefined && row.scope in patch) yield* mark({ ...before, ...patch }).pipe(Effect.orDie);
			}),
		delete: (id) =>
			Effect.gen(function* () {
				const before = yield* byId(id);
				yield* sql`delete from ${sql(`antumbra.${table}`)} where ${sql(row.key)} = ${id}`.pipe(Effect.orDie);
				if (Option.isSome(before)) yield* mark(before.value).pipe(Effect.orDie);
				else yield* announce([row.name]).pipe(Effect.orDie);
			}),
	};
	return writes;
});
const encode = (value: unknown) => (value !== null && typeof value === "object" ? JSON.stringify(value) : value);
