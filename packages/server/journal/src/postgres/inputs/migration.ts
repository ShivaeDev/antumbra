import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra."sessionInput" ("id" text primary key, "sessionId" text not null, "requestDigest" text not null, "parts" jsonb not null, "status" text not null, "detail" text, "createdAt" double precision not null, storage_order bigint generated always as identity)`;
	yield* sql`create table antumbra."input_sessions" ("id" text primary key, "agentId" text not null, "backend" text not null, "cwd" text not null, "nativeRef" text, "status" text not null, "executionStatus" text not null, "completeness" text not null, "outcome" text, "label" text, "kind" text, "parentSessionId" text, "rootSessionId" text not null, "runnerId" text not null, "toolSetVersion" text not null, "startRequestId" text not null, "charterDeliveredAt" text, "attached" boolean not null, "idleSince" text, "stoppedAt" text, "openDelegations" double precision not null, "toolCalls" double precision not null, "createdAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table antumbra."input_operations" ("id" text primary key, "sessionId" text not null, "kind" text not null, "inputId" text, "reason" text not null, "status" text not null, "detail" text, "requestedAt" text not null, "sequence" double precision not null, "gatedBy" text, storage_order bigint generated always as identity)`;
	yield* sql`create table antumbra."input_capacity" ("backend" text primary key, "status" text not null, "reason" text, "detail" text, "observedAt" double precision not null, "resetsAt" double precision, "utilization" double precision, storage_order bigint generated always as identity)`;
});
