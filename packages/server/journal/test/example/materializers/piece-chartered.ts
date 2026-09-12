import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceChartered } from "#example/facts/piece-chartered.ts";
import { piece } from "#example/rows/piece.ts";

export const pieceCharteredMaterializer = materializer(pieceChartered, {
	writes: [piece],
	run: Effect.fn("pieces.PieceChartered")(function* (fact, rows) {
		yield* rows.piece.insert({ id: fact.pieceId, parkedReason: null, status: "chartered", title: fact.title, voyageId: fact.voyageId });
	}),
});
