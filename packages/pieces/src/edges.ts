import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { EdgeWouldCycle, PieceNotFound } from "#errors.ts";
import { reachablePieces } from "#graph.ts";
import type { EdgeRow } from "#model.ts";

export const plannedEdges = Effect.fnUntraced(function* (pieceId: string, dependsOn: ReadonlyArray<string>) {
	const db = yield* Database;
	const known = new Set((yield* db.Piece.where((piece) => piece.id.in(dependsOn)).all()).map((piece) => piece.id));
	const reachable = reachablePieces(yield* db.PieceEdge.all(), pieceId);
	const planned: EdgeRow[] = [];
	for (const dependency of dependsOn) {
		if (!known.has(dependency)) {
			return yield* new PieceNotFound({ pieceId: dependency });
		}
		if (reachable.has(dependency)) {
			return yield* new EdgeWouldCycle({
				fromPieceId: dependency,
				toPieceId: pieceId,
			});
		}
		const edge = { fromPieceId: dependency, toPieceId: pieceId };
		planned.push(edge);
	}
	return planned;
});

export const writeEdges = Effect.fnUntraced(function* (pieceId: string, edges: ReadonlyArray<EdgeRow>) {
	const db = yield* Database;
	yield* db.PieceEdge.where({ toPieceId: pieceId }).deleteAll();
	yield* Effect.forEach(edges, (edge) => db.PieceEdge.create(edge));
});
