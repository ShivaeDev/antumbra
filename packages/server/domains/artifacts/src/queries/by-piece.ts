import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { artifact } from "#rows/artifact.ts";
export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Struct({ current: Schema.Array(artifact.Row), history: Schema.Array(artifact.Row) }),
	reads: [artifact],
	scope: (input) => input.pieceId,
});
