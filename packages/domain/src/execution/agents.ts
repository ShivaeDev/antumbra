import { Database, type StoredAgent } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { decodeStoredAgentStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { decodeRootSession } from "#voyage-world/root-sessions.ts";

export const readAgentExecution = Effect.fnUntraced(function* (agents: ReadonlyArray<StoredAgent>) {
	const db = yield* Database;
	const statuses = yield* Effect.forEach(agents, (agent) =>
		Effect.fromResult(decodeStoredAgentStatus(agent.id, agent.status)).pipe(Effect.map((status) => [agent.id, status] as const)),
	);
	const sessions = yield* db.AgentSession.where(rootSessions)
		.where({ status: "open" })
		.where((session) => session.agentId.in(agents.filter((agent) => agent.status === "alive").map((agent) => agent.id)))
		.all();
	return {
		agentStatus: new Map(statuses),
		currentSessionByAgent: new Map(agents.map((agent) => [agent.id, agent.currentSessionId])),
		sessions: yield* Effect.forEach(sessions, decodeRootSession),
	};
});
