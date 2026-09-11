import type { StoredAgentSession } from "@antumbra/persistence";
import { decodeSessionExecutionStatus } from "@antumbra/platform-vocabulary/agent-runtime/session-execution.ts";
import { decodeStoredAgentSessionStatus } from "@antumbra/platform-vocabulary/agent-runtime/stored-session.ts";
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
