import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

export const progress = query("progress", {
	input: { id: PieceId },
	output: Schema.NullOr(pieceProgress.Row),
	reads: [pieceProgress],
});
