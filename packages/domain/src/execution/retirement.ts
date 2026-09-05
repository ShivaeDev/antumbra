import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { readAgentExecution } from "#execution/agents.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import type { RetirementWorld } from "#voyage-rows.ts";

export const retirement = Effect.fn("ExecutionSource.retirement")(function* () {
	const db = yield* Database;
	const alive = yield* db.Agent.where({ status: "alive" })
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const claims = yield* db.PieceAgent.where((assignment) => assignment.agentId.in(alive.map((agent) => agent.id))).all();
	const pieces = yield* db.Piece.where((piece) => piece.id.in(claims.map((claim) => claim.pieceId)))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const pieceIds = pieces.map((piece) => piece.id);
	const assignments = yield* db.PieceAgent.where((assignment) => assignment.pieceId.in(pieceIds)).all();
	const agents = yield* db.Agent.where((agent) => agent.status.in(["alive", "spawning"]))
		.where((agent) => agent.id.in(assignments.map((assignment) => assignment.agentId)))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	return {
		...(yield* readAgentExecution(agents)),
		...(yield* readOutcomes(pieceIds)),
		assignments,
		pieces,
	} satisfies RetirementWorld;
});
