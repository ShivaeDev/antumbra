import { command } from "@antumbra/feature";
import { Effect, Option, Schema } from "effect";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { PieceId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";

export const park = command("park", {
	input: { pieceId: PieceId, reason: Schema.String },
	reads: [piece],
	emits: pieceParked,
	rejections: { PieceNotFound: { pieceId: PieceId }, PieceNotLaunched: { pieceId: PieceId, status: Schema.String } },
	run: Effect.fn("pieces.park")(function* (input, rows, reject) {
		const stored = yield* rows.piece.find(input.pieceId);
		if (Option.isNone(stored)) return yield* reject.PieceNotFound({ pieceId: input.pieceId });
		const found = stored.value;
		if (found.status !== "launched") return yield* reject.PieceNotLaunched({ pieceId: found.id, status: found.status });
		return { pieceId: found.id, reason: input.reason };
	}),
});
