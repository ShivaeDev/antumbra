import { Database, or } from "@antumbra/persistence";
import { Repos } from "@antumbra/repos";
import { Rulings } from "@antumbra/rulings";
import { rootSessions } from "@antumbra/sessions";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { readOutcomes } from "#execution/outcomes.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import { CAPTAIN_ROLE } from "#voyage-captain.ts";
import { byId } from "#voyage-row-projection.ts";
import { decodeRootSession } from "#voyage-world/root-sessions.ts";
import { decodeVoyage } from "#voyage-world/voyages.ts";

export const read = Effect.fn("VoyageDetails.read")(function* (voyageId: string) {
	const db = yield* Database;
	const rulings = yield* Rulings;
	const repos = yield* Repos;
	const stored = yield* db.Voyage.where({ id: voyageId }).first();
	if (Option.isNone(stored)) return Option.none();
	const voyage = yield* decodeVoyage(stored.value);
	const memberships = yield* db.VoyagePiece.where({ voyageId }).all();
	const memberIds = memberships.map((membership) => membership.pieceId);
	const edges = yield* db.PieceEdge.where((edge) => edge.toPieceId.in(memberIds)).all();
	const pieces = yield* db.Piece.where((piece) => piece.id.in([...memberIds, ...edges.map((edge) => edge.fromPieceId)]))
		.orderBy((piece) => piece.createdAt.asc())
		.all();
	const outcomes = yield* readOutcomes(pieces.map((piece) => piece.id));
	const crews = yield* db.VoyageAgent.where({ voyageId }).all();
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
	const memberReportIds = outcomes.pieceReports.filter((link) => memberIds.includes(link.pieceId)).map((link) => link.reportId);
	const memberChangeIds = new Set(outcomes.pieceChanges.filter((link) => memberIds.includes(link.pieceId)).map((link) => link.changeId));
	const repoIds = outcomes.changes.filter((change) => memberChangeIds.has(change.id)).map((change) => change.repoId);
	const rows = {
		...outcomes,
		agentStatus: new Map(statuses),
		assignments,
		crews,
		currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId])),
		edges,
		memberships,
		pieces,
		reports: byId(yield* db.Report.where((report) => report.id.in(memberReportIds)).all()),
		repos: byId(yield* repos.byIds(repoIds)),
		rulingGates: yield* rulings.openGatesForPieces(memberIds),
		sessions: yield* Effect.forEach(sessions, decodeRootSession),
	} satisfies VoyageDetailRows;
	return Option.some({ voyage, rows });
});
