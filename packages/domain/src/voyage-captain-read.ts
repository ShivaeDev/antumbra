import { Database } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { CAPTAIN_ROLE, captainOf } from "#voyage-captain.ts";
import { decodeRootSession } from "#voyage-world-reads.ts";

export const readVoyageCaptain = Effect.fn("VoyageCaptain.read")(function* (voyageId: string) {
	const db = yield* Database;
	const crews = yield* db.VoyageAgent.where({ role: CAPTAIN_ROLE, voyageId }).all();
	const agentIds = crews.map((crew) => crew.agentId);
	const agents = yield* db.Agent.where((agent) => agent.id.in(agentIds))
		.orderBy((agent) => agent.createdAt.asc())
		.all();
	const agentStatuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => [agent.id, status] as const)),
	);
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where((session) => session.agentId.in(agentIds))
		.all();
	return captainOf(
		{
			agentStatus: new Map(agentStatuses),
			assignments: yield* db.PieceAgent.where((assignment) => assignment.agentId.in(agentIds)).all(),
			crews,
			currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId])),
			sessions: yield* Effect.forEach(sessions, decodeRootSession),
		},
		voyageId,
	);
});
