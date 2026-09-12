import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { pieceChartered } from "#example/facts/piece-chartered.ts";
import { PieceId, VoyageId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";

export const charter = command("charter", {
	input: { pieceId: PieceId, voyageId: VoyageId, title: Schema.String },
	reads: [piece],
	emits: pieceChartered,
	rejections: { PieceExists: { pieceId: PieceId } },
	run: Effect.fn("pieces.charter")(function* (input, rows, reject) {
		if (yield* rows.piece.exists(input.pieceId)) return yield* reject.PieceExists({ pieceId: input.pieceId });
		return { pieceId: input.pieceId, title: input.title, voyageId: input.voyageId };
	}),
});
