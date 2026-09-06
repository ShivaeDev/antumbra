import { Database } from "@antumbra/persistence";
import { decodeSessionExecutionStatus, sessionExecutionTransition } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect, Option } from "effect";
import { announce } from "#current/announce.ts";

export const awaken = Effect.fn("CurrentSessions.awaken")(function* (sessionId: string) {
	const db = yield* Database;
	const stored = yield* db.AgentSession.where({ id: sessionId }).first();
	if (Option.isNone(stored)) {
		return;
	}
	const execution = yield* Effect.fromResult(decodeSessionExecutionStatus(sessionId, stored.value.executionStatus));
	if (execution !== "idle") {
		return;
	}
	const active = yield* Effect.fromResult(sessionExecutionTransition(sessionId, execution, "wake"));
	yield* db.AgentSession.where({
		executionStatus: "idle",
		id: sessionId,
		status: "open",
	}).update({ executionStatus: active });
	yield* announce();
});
