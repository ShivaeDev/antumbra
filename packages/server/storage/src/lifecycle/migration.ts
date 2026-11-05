import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "restart" ("id" text primary key, "sessionIds" jsonb not null, storage_order bigint generated always as identity)`;
});
