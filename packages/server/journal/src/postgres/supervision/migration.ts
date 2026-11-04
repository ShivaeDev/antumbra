import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra."stoppedLoop" ("loop" text primary key, "at" double precision not null, "message" text not null, "trace" text not null, "state" text not null, storage_order bigint generated always as identity)`;
});
