import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { PieceId } from "#ids.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

export const progress = query("progress", {
	input: { id: PieceId },
	output: Schema.NullOr(pieceProgress.Row),
	reads: [pieceProgress],
	run: Effect.fn("pieces.progress")(function* (input, rows) {
		return Option.getOrNull(yield* rows.pieceProgress.find(input.id));
	}),
});
