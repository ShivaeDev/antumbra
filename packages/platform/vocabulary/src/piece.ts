import { Schema } from "effect";
import * as Id from "#id.ts";
import { PieceVerdict } from "#verdict.ts";
import { VoyageId } from "#voyage.ts";

export const PieceId = Id.brand("PieceId");
export type PieceId = typeof PieceId.Type;

const charter = {
	id: PieceId,
	voyageId: VoyageId,
	title: Schema.String,
	charter: Schema.String,
	expectation: Schema.String,
	role: Schema.String,
	charteredAt: Schema.String,
};
export const PieceChartered = Schema.Struct({ ...charter, dependsOn: Schema.Array(PieceId) });
export const PieceLaunched = Schema.Struct({ id: PieceId, launchedAt: Schema.String });
export const PieceParked = Schema.Struct({ id: PieceId, parkedAt: Schema.String });
export const PieceUnparked = Schema.Struct({ id: PieceId });
export const PieceRewired = Schema.Struct({ id: PieceId, dependsOn: Schema.Array(PieceId) });
export const PieceVerdictLanded = Schema.Struct({ id: PieceId, verdict: PieceVerdict });

export const Piece = Schema.Struct({
	...charter,
	launchedAt: Schema.NullOr(Schema.String),
	parkedAt: Schema.NullOr(Schema.String),
	verdict: Schema.NullOr(PieceVerdict),
});
export const PieceEdge = Schema.Struct({ id: Schema.String, from: PieceId, to: PieceId });
export const PieceState = Schema.Literals(["abandoned", "active", "blocked", "done", "held", "landing", "parked", "ready"]);
export const PieceProgress = Schema.Struct({
	id: PieceId,
	voyageId: VoyageId,
	state: PieceState,
	eligible: Schema.Boolean,
	settledDone: Schema.Boolean,
	abandoned: Schema.Boolean,
	concluded: Schema.Boolean,
});
export const VoyagePieceProgress = Schema.Struct({
	id: Schema.String,
	voyageId: VoyageId,
	state: PieceState,
	lastStirredAt: Schema.NullOr(Schema.String),
	concluded: Schema.Boolean,
});
