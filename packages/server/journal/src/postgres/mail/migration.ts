import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`create table antumbra.messages (
  id text primary key, "toAgentId" text not null, "authorAgentId" text, body text not null, precedence text not null,
  "sentAt" text not null, "deliveredAt" text, "readAt" text, sent_order integer not null
 )`;
	yield* sql`create table antumbra.mail_wake_evidence (id integer primary key, evidence jsonb not null)`;
});
