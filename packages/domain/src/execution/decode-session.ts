import type { StoredAgentSession } from "@antumbra/persistence";
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
