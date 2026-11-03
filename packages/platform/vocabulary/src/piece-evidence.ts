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
export const PieceProgressObserved = Schema.Struct({
	id: PieceId,
	outcomes: Schema.Array(PieceOutcome),
	assignments: Schema.Array(PieceAssignmentWork),
	gates: Schema.Array(PieceRulingGate),
});
