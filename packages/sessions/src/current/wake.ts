import { Database } from "@antumbra/persistence";
import { decodeSessionExecutionStatus, sessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";

// why: the row saying a Session has a live execution is written once the
// attachment exists and not a moment before. A wake claimed ahead of the
// provider's answer outlives a failed attach as durable truth nobody can see
// is false, and every later reading takes that Agent for one at work.
export const makeCurrentSessionWake = Effect.gen(function* () {
	const db = yield* Database;
	return (sessionId: string) =>
		Effect.gen(function* () {
			const stored = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(stored)) {
				return false;
			}
			const execution = yield* Effect.fromResult(decodeSessionExecutionStatus(sessionId, stored.value.executionStatus));
			if (execution !== "idle") {
				return false;
			}
			const active = yield* Effect.fromResult(sessionExecutionTransition(sessionId, execution, "wake"));
			yield* db.AgentSession.where({
				executionStatus: "idle",
				id: sessionId,
				status: "open",
			}).update({ executionStatus: active });
			return true;
		});
});
