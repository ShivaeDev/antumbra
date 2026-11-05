import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "repo" ("id" text primary key, "name" text not null, "source" text not null, "defaultRef" text not null, "createdAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "repoReference" ("id" text primary key, "repoId" text not null, storage_order bigint generated always as identity)`;
});
