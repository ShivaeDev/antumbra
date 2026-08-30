import {
	type InvalidSessionExecutionTransition,
	type SessionExecutionStatus,
	sessionExecutionTransition,
} from "@antumbra/vocabulary/agent-runtime";
import { Result } from "effect";
import type { DecodedSession } from "#current-session-reconcile-rows.ts";

// why: draining says a process is still finishing this Session's execution.
// Nothing but that process can settle it, so a draining row with no live
// attachment names a process that is gone — at boot, by definition, and at any
// other moment because the attachment registry is this process's own truth.
// Left standing, the row makes the Session unresumable forever.
export interface SessionExecutionSettlement {
	readonly executionStatus: SessionExecutionStatus;
	readonly sessionId: string;
}

// why: only this process can finish a drain, so its own attachment registry is
// what separates a Session still going out from one whose drain died with the
// process that started it. At boot the set is empty, which is exactly the truth
// a restart leaves behind.
export const planSettlements = (
	sessions: ReadonlyArray<DecodedSession>,
	closing: ReadonlySet<string>,
	attached: ReadonlySet<string>,
): Result.Result<
	ReadonlyArray<SessionExecutionSettlement>,
	InvalidSessionExecutionTransition
> => {
	const settled: Array<SessionExecutionSettlement> = [];
	for (const session of sessions) {
		if (
			session.status !== "open" ||
			session.executionStatus !== "draining" ||
			closing.has(session.id) ||
			attached.has(session.id)
		) {
			continue;
		}
		const next = sessionExecutionTransition(
			session.id,
			session.executionStatus,
			"settle",
		);
		if (Result.isFailure(next)) {
			return Result.fail(next.failure);
		}
		settled.push({ executionStatus: next.success, sessionId: session.id });
	}
	return Result.succeed(settled);
};
