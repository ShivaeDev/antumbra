import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import { Effect } from "effect";
import { EdgeWouldCycle, PieceNotFound } from "#errors.ts";
import { wouldCycle } from "#piece-state.ts";
import type { EdgeRow } from "#voyage-rows.ts";

export type EdgeFailure = EdgeWouldCycle | PieceNotFound | PrismaError;

// why: a dependency is only legal when it names a real piece and leaves the
// graph acyclic. The walk runs against the edges the write is about to
// produce, so a batch that would close a loop only through its own siblings
// is refused whole instead of half-written.
export const plannedEdges = (
	db: DatabaseService,
	pieceId: string,
	dependsOn: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<EdgeRow>, EdgeFailure, WriteExecutors> =>
	Effect.gen(function* () {
		const known = new Set((yield* db.Piece.all()).map((piece) => piece.id));
		let edges = (yield* db.PieceEdge.all()).filter(
			(edge) => edge.toPieceId !== pieceId,
		);
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

// why: rewiring replaces a piece's incoming edges wholesale — the verb edits
// position, and position is exactly the set of things that gate this piece.
export const writeEdges = (
	db: DatabaseService,
	pieceId: string,
	edges: ReadonlyArray<EdgeRow>,
) =>
	db.PieceEdge.where({ toPieceId: pieceId })
		.deleteAll()
		.pipe(
			Effect.andThen(
				Effect.forEach(edges, (edge) => db.PieceEdge.create(edge)),
			),
		);
