import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { EdgeWouldCycle, PieceNotFound } from "#errors.ts";
import { wouldCycle } from "#graph.ts";
import type { EdgeRow } from "#model.ts";

export const plannedEdges = (pieceId: string, dependsOn: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const known = new Set((yield* db.Piece.all()).map((piece) => piece.id));
		let edges = (yield* db.PieceEdge.all()).filter((edge) => edge.toPieceId !== pieceId);
		const planned: EdgeRow[] = [];
		for (const dependency of dependsOn) {
			if (!known.has(dependency)) {
				return yield* new PieceNotFound({ pieceId: dependency });
			}
			if (wouldCycle(edges, dependency, pieceId)) {
				return yield* new EdgeWouldCycle({
					fromPieceId: dependency,
					toPieceId: pieceId,
				});
			}
			const edge = { fromPieceId: dependency, toPieceId: pieceId };
			planned.push(edge);
			edges = [...edges, edge];
		}
		return planned;
	});

export const writeEdges = (pieceId: string, edges: ReadonlyArray<EdgeRow>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* db.PieceEdge.where({ toPieceId: pieceId }).deleteAll();
		yield* Effect.forEach(edges, (edge) => db.PieceEdge.create(edge));
	});
