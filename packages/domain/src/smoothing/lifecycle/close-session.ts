import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect } from "effect";

export const closeSession = Effect.fn("SmootherLifecycle.closeSession")(function* (agentId: string, sessionId: string) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	yield* fabric.stop(sessionId);
	yield* db.AgentSession.where({ id: sessionId, status: "open" }).update({ status: "closed" });
	yield* db.Agent.where({ currentSessionId: sessionId, id: agentId }).update({ currentSessionId: null });
});
