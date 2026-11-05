import type { pieceRewired } from "@antumbra/domain-pieces/facts/piece-rewired.ts";
import { edgeId } from "@antumbra/domain-pieces/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as pieceEdgeSelection } from "@antumbra/server-storage/records/piece-edge.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceRewiredMaterializer = Effect.fn("pieces.PieceRewired")(function* (
	fact: FactValue<typeof pieceRewired>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	for (const standing of yield* rows.pieceEdge
		.findMany({ where: { to: fact.id }, orderBy: { field: "id", direction: "asc" }, select: pieceEdgeSelection })
		.pipe(Effect.orDie)) {
		yield* rows.pieceEdge.delete(standing.id).pipe(Effect.orDie);
	}
	for (const dependency of fact.dependsOn) {
		yield* rows.pieceEdge.insertVoid({ from: dependency, id: edgeId(dependency, fact.id), to: fact.id }).pipe(Effect.orDie);
	}
});
