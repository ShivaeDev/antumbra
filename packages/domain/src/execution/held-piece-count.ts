import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { heldPieceCount as countHeldPieces } from "#piece-state.ts";

export const heldPieceCount = Effect.fn("ExecutionSource.heldPieceCount")(function* (voyageId: string) {
	const db = yield* Database;
	const memberships = yield* db.VoyagePiece.where({ voyageId }).all();
	const pieces = yield* db.Piece.where((piece) => piece.id.in(memberships.map((membership) => membership.pieceId)))
		.where({ launchedAt: null, parkedAt: null })
		.all();
	const pieceIds = pieces.map((piece) => piece.id);
	const assignments = yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.id.in(assignments.map((assignment) => assignment.agentId)))
		.where((agent) => agent.status.in(["alive", "spawning"]))
		.all();
	return countHeldPieces({
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments,
		pieces,
	});
});
