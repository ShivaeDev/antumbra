import { Effect } from "effect";
import { SqlClient } from "effect/sql";
export const migration = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`drop table antumbra."change_context_session"`;
	yield* sql`drop table antumbra."change_context_berth"`;
	yield* sql`drop table antumbra."change_context_moorage"`;
	yield* sql`drop table antumbra."change_context_agent"`;
	yield* sql`drop table antumbra."change_context_voyageActivity"`;
	yield* sql`drop table antumbra."change_context_pieceAgent"`;
	yield* sql`drop table antumbra."change_captain_work"`;
	yield* sql`drop table antumbra."change_resource_owners"`;
	yield* sql`drop table antumbra."input_sessions"`;
	yield* sql`drop table antumbra."input_operations"`;
	yield* sql`drop table antumbra."input_capacity"`;
});
