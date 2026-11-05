import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table "ruling" ("id" text primary key, "requester" jsonb not null, "question" text not null, "context" text not null, "declaredRadius" text not null, "declaredUrgency" text not null, "radius" text not null, "urgency" text not null, "rung" text, "choices" jsonb not null, "subjects" jsonb not null, "contexts" jsonb not null, "reclassifications" jsonb not null, "recommendation" jsonb, "answer" jsonb, "parked" jsonb, "supersession" jsonb, "withdrawal" jsonb, "deliveredAt" text, "createdAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create table "rulingNoticeReceipt" ("id" text primary key, "rulingId" text not null, "deliveredAt" text not null, storage_order bigint generated always as identity)`;
	yield* sql`create index on "rulingNoticeReceipt" ("rulingId")`;
	yield* sql`create table "rulingGate" ("id" text primary key, "rulingId" text not null, "pieceId" text not null, "question" text not null, "open" boolean not null, storage_order bigint generated always as identity)`;
	yield* sql`create index on "rulingGate" ("rulingId")`;
	yield* sql`create table "rulingDisplay" ("id" text primary key, "requester" jsonb not null, "question" text not null, "context" text not null, "declaredRadius" text not null, "declaredUrgency" text not null, "radius" text not null, "urgency" text not null, "rung" text, "choices" jsonb not null, "subjects" jsonb not null, "contexts" jsonb not null, "reclassifications" jsonb not null, "recommendation" jsonb, "answer" jsonb, "parked" jsonb, "supersession" jsonb, "withdrawal" jsonb, "deliveredAt" text, "createdAt" text not null, "voyage" jsonb, "recommendedLabel" text, "chosenLabel" text, "requesterName" text not null, "rungName" text not null, "subjectLabels" jsonb not null, "speakers" jsonb not null, "gatedPieces" jsonb not null, "stale" boolean not null, storage_order bigint generated always as identity)`;
});
