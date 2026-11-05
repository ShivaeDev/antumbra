import { Schema } from "effect";
import { PieceId } from "#piece.ts";

export const PieceOutcome = Schema.Struct({
	id: Schema.String,
	pieceId: PieceId,
	sourceKind: Schema.Literals(["report", "artifact", "change"]),
	sourceId: Schema.String,
	status: Schema.Literals(["landed", "pending"]),
});
export const PieceAssignmentWork = Schema.Struct({ id: Schema.String, pieceId: PieceId, agentId: Schema.String, working: Schema.Boolean });
export const PieceRulingGate = Schema.Struct({ id: Schema.String, pieceId: PieceId, rulingId: Schema.String });

export const outcomeId = (sourceKind: "report" | "artifact" | "change", sourceId: string, pieceId: PieceId): string =>
	JSON.stringify([sourceKind, sourceId, pieceId]);
