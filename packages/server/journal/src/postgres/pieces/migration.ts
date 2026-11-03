import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra.pieces (
 id text primary key, "voyageId" text not null references antumbra.voyages(id), title text not null, charter text not null,
 expectation text not null, role text not null, "charteredAt" text not null, "launchedAt" text, "parkedAt" text, verdict text,
 chartered_order integer not null
 )`;
	yield* sql`create table antumbra.piece_edges (
 id text primary key, "from" text not null references antumbra.pieces(id), "to" text not null references antumbra.pieces(id), edge_order integer not null
 )`;
	yield* sql`create table antumbra.piece_outcomes (
 id text primary key, "pieceId" text not null references antumbra.pieces(id), "sourceKind" text not null, "sourceId" text not null, status text not null
 )`;
	yield* sql`create table antumbra.piece_assignments (
 id text primary key, "pieceId" text not null references antumbra.pieces(id), "agentId" text not null, working boolean not null
 )`;
	yield* sql`create table antumbra.piece_ruling_gates (
 id text primary key, "pieceId" text not null references antumbra.pieces(id), "rulingId" text not null
 )`;
	yield* sql`create table antumbra.piece_progress (
 id text primary key references antumbra.pieces(id), "voyageId" text not null references antumbra.voyages(id), state text not null,
 eligible boolean not null, "settledDone" boolean not null, abandoned boolean not null, concluded boolean not null
 )`;
	yield* sql`create table antumbra.voyage_piece_progress (
 id text primary key references antumbra.pieces(id), "voyageId" text not null references antumbra.voyages(id), state text not null,
 "lastStirredAt" text, concluded boolean not null
 )`;
});
