import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "voyageActivity" (id text primary key, "voyageId" text not null, "sourceKind" text not null, "sourceId" text not null, at text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "voyageCaptainWork" (id text primary key, "voyageId" text not null, "agentId" text not null, working boolean not null, storage_order bigint generated always as identity)`;
	yield* sql`create table antumbra.runner_cursor (log_id text primary key, cursor double precision not null)`;
	yield* sql`insert into events_streams (store, stream, version) values ('execution', 'execution', 0)`;
});
