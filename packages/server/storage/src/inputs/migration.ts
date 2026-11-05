import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "sessionInput" ("id" text primary key, "sessionId" text not null, "requestDigest" text not null, "parts" jsonb not null, "status" text not null, "detail" text, "createdAt" double precision not null, storage_order bigint generated always as identity)`;
});
