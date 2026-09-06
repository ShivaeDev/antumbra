import { materializer } from "@antumbra/journal";
import { Effect } from "effect";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { piece } from "#example/rows/piece.ts";

export const pieceParkedMaterializer = materializer(pieceParked, {
	writes: [piece],
	run: Effect.fn("pieces.PieceParked")(function* (fact, rows) {
		yield* rows.piece.update(fact.pieceId, { status: "parked", parkedReason: fact.reason });
	}),
});
