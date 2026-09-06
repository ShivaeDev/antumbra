import {
	type InvalidSessionExecutionTransition,
	type SessionExecutionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime.ts";
import { Result } from "effect";
import type { DecodedSession } from "#current/reconcile-rows.ts";

export interface SessionExecutionSettlement {
	readonly executionStatus: SessionExecutionStatus;
	readonly sessionId: string;
}

// Only the process holding an attachment can finish a drain.
// An unattached drain remains after that process exits and must return to idle.
export const planSettlements = (
	sessions: ReadonlyArray<DecodedSession>,
	closing: ReadonlySet<string>,
	attached: ReadonlySet<string>,
): Result.Result<ReadonlyArray<SessionExecutionSettlement>, InvalidSessionExecutionTransition> => {
	const settled: Array<SessionExecutionSettlement> = [];
	for (const session of sessions) {
		if (session.status !== "open" || session.executionStatus !== "draining" || closing.has(session.id) || attached.has(session.id)) {
			continue;
		}
		const next = sessionExecutionTransition(session.id, session.executionStatus, "settle");
		if (Result.isFailure(next)) {
			return Result.fail(next.failure);
		}
		settled.push({ executionStatus: next.success, sessionId: session.id });
	}
	return Result.succeed(settled);
};
