import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "resourceOwner" ("agentId" text primary key, "status" text not null, "openSessions" double precision not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "moorage" ("agentId" text primary key, "runner" text not null, "root" text not null, "status" text not null, "reclaimState" text, storage_order bigint generated always as identity)`;
	yield* sql`create table "berth" ("id" text primary key, "agentId" text not null, "runner" text not null, "source" text not null, "slug" text not null, "ref" text not null, "branch" text not null, "path" text not null, "status" text not null, "reclaimRequestId" text, "reclaimResult" text, "reclaimState" text, "strandedAt" double precision, storage_order bigint generated always as identity)`;
	yield* sql`create index on "berth" ("agentId")`;
});
