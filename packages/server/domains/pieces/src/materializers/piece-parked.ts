import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceParked } from "#facts/piece-parked.ts";
import { piece } from "#rows/piece.ts";

export const pieceParkedMaterializer = materializer(pieceParked, {
	writes: [piece],
	run: Effect.fn("pieces.PieceParked")(function* (fact, rows) {
		yield* rows.piece.update(fact.id, { parkedAt: fact.parkedAt });
	}),
});
