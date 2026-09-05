import { Database } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { decodeVoyage } from "#voyage/decode.ts";
import type { DispatchWorld } from "#voyage-rows.ts";

export const dispatch = Effect.fn("ExecutionSource.dispatch")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const launched = yield* db.Piece.where({ parkedAt: null })
		.where((piece) => piece.launchedAt.isNotNull())
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const memberships = yield* db.VoyagePiece.where((membership) => membership.pieceId.in(launched.map((piece) => piece.id))).all();
	const candidateIds = new Set(memberships.map((membership) => membership.pieceId));
	const candidates = launched.filter((piece) => candidateIds.has(piece.id));
	const edges = yield* db.PieceEdge.where((edge) => edge.toPieceId.in([...candidateIds])).all();
	const prerequisites = yield* db.Piece.where((piece) => piece.id.in(edges.map((edge) => edge.fromPieceId).filter((id) => !candidateIds.has(id))))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const pieces = [...candidates, ...prerequisites].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
	const pieceIds = pieces.map((piece) => piece.id);
	const agents = yield* db.Agent.where((agent) => agent.status.in(["alive", "spawning"]))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(memberships.map((membership) => membership.voyageId)))
		.orderBy((voyage) => voyage.createdAt.asc())
		.all();
	return {
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments: yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all(),
		edges,
		memberships,
		pieces,
		rulingGates: yield* rulings.openGatesForPieces([...candidateIds]),
		voyages: yield* Effect.forEach(voyages, decodeVoyage),
	} satisfies DispatchWorld;
});
