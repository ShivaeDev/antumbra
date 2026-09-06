import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";
import { rootSessionsOf } from "#roots.ts";

export const stopRoots = Effect.fn("SessionRetirement.stopRoots")(function* (agentId: string) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const sessions = yield* db.AgentSession.where(rootSessionsOf(agentId)).all();
	yield* Effect.forEach(sessions, (session) => Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status)));
	yield* Effect.forEach(sessions, (session) => fabric.stop(session.id));
});
