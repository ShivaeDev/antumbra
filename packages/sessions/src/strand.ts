import { Database } from "@antumbra/persistence";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";

// why: a stream that ends while the row still says active leaves a Session
// stranded — the process doing the work is gone and the work never finished.
// Nothing goes and fetches it back; only a send or a hail does. So the moment
// it happened is written down, because the row alone says the state and never
// says when it began, and "when" is the whole of what a reader asks first.
export const makeStrandNotice = Effect.gen(function* () {
	const db = yield* Database;
	const notice = (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* db.AgentSession.where({ id: sessionId }).first();
			if (Option.isNone(session)) {
				return;
			}
			const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(sessionId, session.value.status));
			const execution = yield* Effect.fromResult(decodeSessionExecutionStatus(sessionId, session.value.executionStatus));
			if (status !== "open" || execution !== "active") {
				return;
			}
			yield* Effect.logWarning("a session stranded when its stream ended", {
				sessionId,
			});
		});
	return (sessionId: string): Effect.Effect<void> =>
		notice(sessionId).pipe(Effect.catchCause((cause) => Effect.logError("a stranding could not be read", { sessionId }, cause)));
});
