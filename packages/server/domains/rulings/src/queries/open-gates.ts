import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { rulingGate } from "#rows/gate.ts";
export const openGates = query("openGates", {
	input: { pieceIds: Schema.NullOr(Schema.Array(PieceId)) },
	output: Schema.Array(rulingGate.Row),
	reads: [rulingGate],
	run: Effect.fn("rulings.openGates")(function* (input, rows) {
		return (yield* rows.rulingGate.where({ open: true })).filter((gate) => input.pieceIds === null || input.pieceIds.includes(gate.pieceId));
	}),
});
