import type { pieceChartered } from "@antumbra/domain-pieces/facts/piece-chartered.ts";
import { edgeId } from "@antumbra/domain-pieces/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceCharteredMaterializer = Effect.fn("pieces.PieceChartered")(function* (
	fact: FactValue<typeof pieceChartered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.piece
		.insertVoid({
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
		})
		.pipe(Effect.orDie);
	for (const dependency of fact.dependsOn) {
		yield* rows.pieceEdge.insertVoid({ from: dependency, id: edgeId(dependency, fact.id), to: fact.id }).pipe(Effect.orDie);
	}
});
