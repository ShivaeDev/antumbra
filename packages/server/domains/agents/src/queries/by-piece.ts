import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
});
