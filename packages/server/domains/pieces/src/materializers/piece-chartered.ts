import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceChartered } from "#facts/piece-chartered.ts";
import { edgeId } from "#ids.ts";
import { pieceEdge } from "#rows/piece-edge.ts";
import { piece } from "#rows/piece.ts";

export const pieceCharteredMaterializer = materializer(pieceChartered, {
	writes: [piece, pieceEdge],
	run: Effect.fn("pieces.PieceChartered")(function* (fact, rows) {
		yield* rows.piece.insert({
			charter: fact.charter,
			charteredAt: fact.charteredAt,
			expectation: fact.expectation,
			id: fact.id,
			launchedAt: null,
			parkedAt: null,
			role: fact.role,
			title: fact.title,
			verdict: null,
			voyageId: fact.voyageId,
		});
		for (const dependency of fact.dependsOn) {
			yield* rows.pieceEdge.insert({ from: dependency, id: edgeId(dependency, fact.id), to: fact.id });
		}
	}),
});
