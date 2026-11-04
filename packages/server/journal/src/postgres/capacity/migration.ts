import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra."capacity" ("backend" text primary key, "status" text not null, "reason" text, "detail" text, "observedAt" double precision not null, "resetsAt" double precision, "utilization" double precision, storage_order bigint generated always as identity)`;
});
