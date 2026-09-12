import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { pieceChangeView } from "#rows/piece-change-view.ts";
export const byPiece = query("byPiece", {
	input: { pieceId: PieceId },
	output: Schema.Array(pieceChangeView.Row),
	reads: [pieceChangeView],
	run: Effect.fn("changes.byPiece")(function* (input, rows) {
		return yield* rows.pieceChangeView.where(input);
	}),
});
