import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { Rulings } from "@antumbra/rulings";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { edgesOfVoyages, membershipsOf } from "#piece-reading.ts";
import type { DispatchWorld } from "#voyage-rows.ts";

export const dispatch = Effect.fn("ExecutionSource.dispatch")(function* () {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const sailing = yield* Voyages;
	const berthed = yield* (yield* Pieces).list();
	const candidates = berthed.filter((piece) => piece.parkedAt === null && piece.launchedAt !== null);
	const candidateIds = new Set(candidates.map((piece) => piece.id));
	const wired = yield* edgesOfVoyages(new Set(candidates.map((piece) => piece.voyageId)));
	const edges = wired.filter((edge) => candidateIds.has(edge.toPieceId));
	const prerequisiteIds = new Set(edges.map((edge) => edge.fromPieceId).filter((id) => !candidateIds.has(id)));
	const pieces = berthed.filter((piece) => candidateIds.has(piece.id) || prerequisiteIds.has(piece.id));
	const pieceIds = pieces.map((piece) => piece.id);
	const agents = yield* db.Agent.where((agent) => agent.status.in(["alive", "spawning"]))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const sailed = new Set(candidates.map((piece) => piece.voyageId));
	const voyages = (yield* sailing.list()).filter((voyage) => sailed.has(voyage.id));
	return {
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments: yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all(),
		edges,
		memberships: membershipsOf(candidates),
		pieces,
		rulingGates: yield* rulings.openGatesForPieces([...candidateIds]),
		voyages,
	} satisfies DispatchWorld;
});
