import { command } from "@antumbra/journal";
import { Effect, Schema } from "effect";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { PieceId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";

export const park = command("park", {
	input: { pieceId: PieceId, reason: Schema.String },
	reads: [piece],
	emits: pieceParked,
	rejections: { PieceNotLaunched: { pieceId: PieceId, status: Schema.String } },
	run: Effect.fn("pieces.park")(function* (input, rows, reject) {
		const found = yield* rows.piece.get(input.pieceId);
		if (found.status !== "launched") return yield* reject.PieceNotLaunched({ pieceId: found.id, status: found.status });
		return { pieceId: found.id, reason: input.reason };
	}),
});
