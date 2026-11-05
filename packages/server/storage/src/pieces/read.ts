import { Piece, PieceEdge, type PieceId, PieceProgress, VoyagePieceProgress } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceAssignmentWork, PieceOutcome, PieceRulingGate } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";

export const all = Effect.fn("PieceHistory.all")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "piece" order by "charteredAt", chartered_order`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Piece))),
	);
});
export const byId = Effect.fn("PieceHistory.byId")(function* (id: PieceId) {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "piece" where id = ${id}`.pipe(
		Effect.flatMap((rows) => Schema.decodeUnknownEffect(Schema.NullOr(Piece))(rows[0] ?? null)),
	);
});
export const edges = Effect.fn("PieceHistory.edges")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select e.* from "pieceEdge" e join "piece" p on p.id = e."to"
 order by p."charteredAt", p.chartered_order, e.edge_order`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceEdge))));
});
export const progress = Effect.fn("PieceHistory.progress")(function* (id: PieceId) {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "pieceProgress" where id = ${id}`.pipe(
		Effect.flatMap((rows) => Schema.decodeUnknownEffect(Schema.NullOr(PieceProgress))(rows[0] ?? null)),
	);
});
export const evidence = Effect.fn("PieceHistory.evidence")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const outcomes = yield* sql`select * from "pieceOutcome" order by id`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceOutcome))));
	const assignments = yield* sql`select * from "pieceAssignmentWork" order by id`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceAssignmentWork))),
	);
	const gates = yield* sql`select * from "pieceRulingGate" order by id`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceRulingGate))),
	);
	return { outcomes, assignments, gates };
});
export const members = Effect.fn("PieceHistory.members")(function* () {
	const sql = yield* SqlClient.SqlClient;
	return yield* sql`select * from "voyagePieceProgress" order by id`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(VoyagePieceProgress))),
	);
});
