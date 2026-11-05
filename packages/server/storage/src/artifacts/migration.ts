import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "artifact" ("id" text primary key, "pieceId" text not null, "authorAgentId" text, "title" text not null, "digest" text not null, "byteSize" double precision not null, "basename" text not null, "supersededByArtifactId" text, "createdAt" double precision not null, storage_order bigint generated always as identity)`;
});
