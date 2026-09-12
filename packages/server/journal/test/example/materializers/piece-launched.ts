import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceLaunched } from "#example/facts/piece-launched.ts";
import { piece } from "#example/rows/piece.ts";

export const pieceLaunchedMaterializer = materializer(pieceLaunched, {
	writes: [piece],
	run: Effect.fn("pieces.PieceLaunched")(function* (fact, rows) {
		yield* rows.piece.update(fact.pieceId, { parkedReason: null, status: "launched" });
	}),
});
