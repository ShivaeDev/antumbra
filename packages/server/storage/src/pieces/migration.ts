import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "piece" (
 id text primary key, "voyageId" text not null references "voyage"(id), title text not null, charter text not null,
 expectation text not null, role text not null, "charteredAt" text not null, "launchedAt" text, "parkedAt" text, verdict text,
 chartered_order integer not null
 )`;
	yield* sql`create table "pieceEdge" (
 id text primary key, "from" text not null references "piece"(id), "to" text not null references "piece"(id), edge_order integer not null
 )`;
	yield* sql`create table "pieceOutcome" (
 id text primary key, "pieceId" text not null references "piece"(id), "sourceKind" text not null, "sourceId" text not null, status text not null
 )`;
	yield* sql`create table "pieceAssignmentWork" (
 id text primary key, "pieceId" text not null references "piece"(id), "agentId" text not null, working boolean not null
 )`;
	yield* sql`create table "pieceRulingGate" (
 id text primary key, "pieceId" text not null references "piece"(id), "rulingId" text not null
 )`;
	yield* sql`create table "pieceProgress" (
 id text primary key references "piece"(id), "voyageId" text not null references "voyage"(id), state text not null,
 eligible boolean not null, "settledDone" boolean not null, abandoned boolean not null, concluded boolean not null
 )`;
	yield* sql`create table "voyagePieceProgress" (
 id text primary key references "piece"(id), "voyageId" text not null references "voyage"(id), state text not null,
 "lastStirredAt" text, concluded boolean not null
 )`;
});
