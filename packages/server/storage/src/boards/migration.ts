import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "boardEntry" ("id" text primary key, "board" text not null, "seq" integer not null, "kind" text not null, "register" text not null, "authorAgentId" text, "body" text not null, "level" text, "coversFrom" integer, "coversTo" integer, "pieceId" text, "createdAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "smoothingAttempt" ("id" text primary key, "voyageId" text not null, "pieceId" text, "throughToday" boolean not null, "requestedAt" text not null, "by" text not null, "status" text not null, "detail" text, storage_order bigint generated always as identity)`;
	yield* sql`create table "smoothingSession" ("sessionId" text primary key, "attemptId" text not null, "agentId" text not null, "coversFrom" double precision not null, "coversTo" double precision not null, "board" text not null, "pieceId" text, "title" text not null, "level" text not null, "status" text not null, storage_order bigint generated always as identity)`;
});
