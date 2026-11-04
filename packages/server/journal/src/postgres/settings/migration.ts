import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra."flag" ("key" text primary key, "scope" text not null, "on" boolean not null, storage_order bigint generated always as identity)`;
	yield* sql`create table antumbra."count" ("key" text primary key, "scope" text not null, "count" double precision not null, storage_order bigint generated always as identity)`;
});
