import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
	run: Effect.fn("Agents.byPiece")(function* (input, rows) {
		return (yield* rows.agentReading.where({})).filter((held) => held.pieceIds.includes(input.pieceId));
	}),
});
