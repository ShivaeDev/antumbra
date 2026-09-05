import { Database } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { atWork } from "#agent-at-work.ts";
import { decodeRootSession } from "#execution/decode-session.ts";

export const workingAssignee = Effect.fn("Pieces.workingAssignee")(function* (pieceId: string) {
	const db = yield* Database;
	const assignments = yield* db.PieceAgent.where({ pieceId }).all();
	const agentIds = assignments.map((assignment) => assignment.agentId);
	const agents = yield* db.Agent.where((agent) => agent.id.in(agentIds)).all();
	const statuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => [agent.id, status] as const)),
	);
	const aliveAgentIds = statuses.filter(([, status]) => status === "alive").map(([agentId]) => agentId);
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where({ status: "open" })
		.where((session) => session.agentId.in(aliveAgentIds))
		.all();
	const execution = {
		agentStatus: new Map(statuses),
		currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId])),
		sessions: yield* Effect.forEach(sessions, decodeRootSession),
	};
	return assignments.find((assignment) => atWork(execution, assignment.agentId))?.agentId;
});
