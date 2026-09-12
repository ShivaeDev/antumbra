import { Database, or } from "@antumbra/persistence";
import { decodeStoredAgentStatus } from "@antumbra/platform-vocabulary/agent-runtime/stored.ts";
import { Rulings } from "@antumbra/rulings";
import { rootSessions } from "@antumbra/sessions";
import { RoleSettings } from "@antumbra/settings";
import { Effect } from "effect";
import { decodeRootSession } from "#execution/decode-session.ts";
import { readOutcomes } from "#execution/outcomes.ts";
import { edgesOfVoyages, membershipsOf, piecesByIds, piecesOfVoyages } from "#piece-reading.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import type { VoyageSummaryRows } from "#voyage-rows.ts";

export const related = Effect.fnUntraced(function* (voyageIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const roles = yield* RoleSettings;
	const members = yield* piecesOfVoyages(voyageIds);
	const memberships = membershipsOf(members);
	const memberIds = members.map((piece) => piece.id);
	const berthed = new Set(memberIds);
	const edges = (yield* edgesOfVoyages(new Set(voyageIds))).filter((edge) => berthed.has(edge.toPieceId));
	const pieces = yield* piecesByIds([...memberIds, ...edges.map((edge) => edge.fromPieceId)]);
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
