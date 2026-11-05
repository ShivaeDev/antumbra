import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "captainReading" ("voyageId" text primary key, "agentId" text, "currentSessionId" text, "standing" text not null, "status" text, "atWork" boolean not null, "canHail" boolean not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "agentReading" ("id" text primary key, "role" text not null, "status" text not null, "currentSessionId" text, "createdAt" text not null, "updatedAt" text not null, "pieceIds" jsonb not null, "voyageIds" jsonb not null, "state" text not null, "standing" text not null, "detail" text, "backend" text, "atWork" boolean not null, "working" boolean not null, "canSend" boolean not null, "canSleep" boolean not null, "canInterrupt" boolean not null, "canRetire" boolean not null, "idleSince" text, storage_order bigint generated always as identity)`;
	yield* sql`create table "agent" ("id" text primary key, "role" text not null, "status" text not null, "currentSessionId" text, "createdAt" text not null, "updatedAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "birth" ("id" text primary key, "operationRequestId" text not null, "createsAgent" boolean not null, "cwd" text, "source" text not null, "agentId" text not null, "sessionId" text not null, "voyageId" text, "pieceId" text, "backend" text, "model" text, "effort" text, "role" text not null, "status" text not null, "detail" text, "requestedAt" text not null, "admittedAt" text, storage_order bigint generated always as identity)`;
	yield* sql`create table "pieceAgent" ("id" text primary key, "pieceId" text not null, "agentId" text not null, "assignedAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create index on "pieceAgent" ("pieceId")`;
	yield* sql`create table "voyageAgent" ("id" text primary key, "voyageId" text not null, "agentId" text not null, "role" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create index on "voyageAgent" ("voyageId")`;
});
