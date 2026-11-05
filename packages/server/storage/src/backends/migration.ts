import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "backendModel" ("id" text primary key, "backend" text not null, "model" text not null, "name" text not null, "isDefault" boolean not null, "defaultEffort" text, "efforts" jsonb not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "backendCatalog" ("backend" text primary key, "failure" text, "imageInput" boolean, storage_order bigint generated always as identity)`;
});
