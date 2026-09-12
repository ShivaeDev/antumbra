import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceVerdictLanded } from "#facts/piece-verdict-landed.ts";
import { piece } from "#rows/piece.ts";

export const pieceVerdictLandedMaterializer = materializer(pieceVerdictLanded, {
	writes: [piece],
	run: Effect.fn("pieces.PieceVerdictLanded")(function* (fact, rows) {
		yield* rows.piece.update(fact.id, { verdict: fact.verdict });
	}),
});
