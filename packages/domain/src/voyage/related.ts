import { Database, or } from "@antumbra/persistence";
import { Rulings } from "@antumbra/rulings";
import { rootSessions } from "@antumbra/sessions";
import { RoleSettings } from "@antumbra/settings";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { decodeRootSession } from "#execution/decode-session.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import type { VoyageSummaryRows } from "#voyage-rows.ts";

export const related = Effect.fnUntraced(function* (voyageIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const roles = yield* RoleSettings;
	const memberships = yield* db.VoyagePiece.where((membership) => membership.voyageId.in(voyageIds)).all();
	const memberIds = memberships.map((membership) => membership.pieceId);
	const edges = yield* db.PieceEdge.where((edge) => edge.toPieceId.in(memberIds)).all();
	const pieces = yield* db.Piece.where((piece) => piece.id.in([...memberIds, ...edges.map((edge) => edge.fromPieceId)]))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const outcomes = yield* readOutcomes(pieces.map((piece) => piece.id));
	const crews = yield* db.VoyageAgent.where((crew) => crew.voyageId.in(voyageIds)).all();
	const captainIds = crews.filter((crew) => crew.role === CAPTAIN_ROLE).map((crew) => crew.agentId);
	const assignments = yield* db.PieceAgent.where((assignment) => or(assignment.pieceId.in(memberIds), assignment.agentId.in(captainIds))).all();
	const agentIds = [...crews.map((crew) => crew.agentId), ...assignments.map((assignment) => assignment.agentId)];
	const agents = yield* db.Agent.where((agent) => agent.id.in(agentIds))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const statuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => [agent.id, status] as const)),
	);
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where((session) => session.agentId.in(agentIds))
		.all();
	return {
		...outcomes,
		agentStatus: new Map(statuses),
		assignments,
		crews,
		currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId])),
		edges,
		memberships,
		pieces,
		roleSettings: yield* roles.forVoyages(voyageIds),
		rulingGates: yield* rulings.openGatesForPieces(memberIds),
		sessions: yield* Effect.forEach(sessions, decodeRootSession),
	} satisfies Omit<VoyageSummaryRows, "voyages">;
});
