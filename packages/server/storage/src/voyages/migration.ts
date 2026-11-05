import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "voyage" (
		id text primary key, kind text not null, name text not null, "northStar" text not null,
		context text not null, "openedAt" text not null, "focusedAt" text, "quietedAt" text,
		opened_order integer not null
	)`;
	yield* sql`create table antumbra.voyage_roles (
		id text primary key, scope text not null references "voyage"(id), role text not null,
		backend text, model text, effort text
	)`;
	yield* sql`create table "voyageProgress" (
		id text primary key references "voyage"(id), total integer not null, counts jsonb not null,
		state text not null, "lastStirredAt" text, concluded boolean not null
	)`;
});
