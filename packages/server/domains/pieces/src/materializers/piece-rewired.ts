import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { pieceRewired } from "#facts/piece-rewired.ts";
import { edgeId } from "#ids.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const pieceRewiredMaterializer = materializer(pieceRewired, {
	writes: [pieceEdge],
	run: Effect.fn("pieces.PieceRewired")(function* (fact, rows) {
		for (const standing of yield* rows.pieceEdge.where({ to: fact.id })) {
			yield* rows.pieceEdge.delete(standing.id);
		}
		for (const dependency of fact.dependsOn) {
			yield* rows.pieceEdge.insert({ from: dependency, id: edgeId(dependency, fact.id), to: fact.id });
		}
	}),
});
