import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceUnparked } from "#facts/piece-unparked.ts";
import { piece } from "#rows/piece.ts";

export const pieceUnparkedMaterializer = materializer(pieceUnparked, {
	writes: [piece],
	run: Effect.fn("pieces.PieceUnparked")(function* (fact, rows) {
		yield* rows.piece.update(fact.id, { parkedAt: null });
	}),
});
