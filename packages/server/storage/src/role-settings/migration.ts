import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "roleSetting" ("id" text primary key, "scope" text not null, "role" text not null, "backend" text, "model" text, "effort" text, storage_order bigint generated always as identity)`;
});
