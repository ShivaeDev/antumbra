import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "report" ("id" text primary key, "authorAgentId" text, "title" text not null, "body" text not null, "createdAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "pieceReport" ("id" text primary key, "pieceId" text not null, "reportId" text not null, storage_order bigint generated always as identity)`;
});
