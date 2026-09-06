import { Database } from "@antumbra/persistence";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus, sessionPresence } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";
import { sessionRetirable } from "#at-rest.ts";
import { AgentStillWorking } from "#retirement/errors.ts";
import { rootSessionsOf } from "#roots.ts";

export const ensureRetirable = Effect.fn("SessionRetirement.ensureRetirable")(function* (agentId: string) {
	const db = yield* Database;
	const fabric = yield* SessionFabric;
	const attached = yield* fabric.attached();
	const sessions = yield* db.AgentSession.where(rootSessionsOf(agentId)).all();
	for (const session of sessions) {
		const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status));
		const executionStatus = yield* Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus));
		const presence = sessionPresence({
			attached: attached.has(session.id),
			executionStatus,
			open: status === "open",
		});
		if (!sessionRetirable(presence)) {
			return yield* new AgentStillWorking({ agentId, sessionId: session.id });
		}
	}
});
