import { Voyage, type VoyageId, VoyageProgress, VoyageRoleSetting } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const list = Effect.fn("VoyageHistory.list")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql`select * from "voyage" order by "openedAt", opened_order`;
	return yield* Schema.decodeUnknownEffect(Schema.Array(Voyage))(rows);
});

export const byId = Effect.fn("VoyageHistory.byId")(function* (id: VoyageId) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql`select * from "voyage" where id = ${id}`;
	return yield* Schema.decodeUnknownEffect(Schema.NullOr(Voyage))(rows[0] ?? null);
});

export const progress = Effect.fn("VoyageHistory.progress")(function* (id: VoyageId) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql`select * from "voyageProgress" where id = ${id}`;
	return yield* Schema.decodeUnknownEffect(Schema.NullOr(VoyageProgress))(rows[0] ?? null);
});

export const roles = Effect.fn("VoyageHistory.roles")(function* (id: VoyageId) {
	const sql = yield* SqlClient.SqlClient;
	const rows = yield* sql`select * from antumbra.voyage_roles where scope = ${id} order by role`;
	return yield* Schema.decodeUnknownEffect(Schema.Array(VoyageRoleSetting))(rows);
});
