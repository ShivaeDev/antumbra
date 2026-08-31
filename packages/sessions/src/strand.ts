import { Database } from "@antumbra/persistence";
import { decodeSessionExecutionStatus, decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";

// A stream ending while its durable row is active leaves the Session stranded until a send or hail resumes it.
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
