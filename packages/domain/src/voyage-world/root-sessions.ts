import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";

export const decodeRootSession = (session: StoredAgentSession) =>
	Effect.all({
		executionStatus: Effect.fromResult(decodeSessionExecutionStatus(session.id, session.executionStatus)),
		status: Effect.fromResult(decodeStoredAgentSessionStatus(session.id, session.status)),
	}).pipe(
		Effect.map(({ executionStatus, status }) => ({
			...session,
			executionStatus,
			status,
		})),
	);

export const readRootSessions = Effect.fnUntraced(function* () {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.AgentSession.where(rootSessions).all(), decodeRootSession);
});
