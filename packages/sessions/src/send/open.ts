import { Database } from "@antumbra/persistence";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { makeRefuseSubsessionAttach } from "#attach-roots.ts";
import { SessionEnded, SessionNotFound } from "#errors.ts";
import { SessionReach } from "#reach.ts";

export const openSession = Effect.fn("SessionSend.openSession")(function* (sessionId: string) {
	const db = yield* Database;
	const session = yield* db.AgentSession.where({ id: sessionId }).first();
	if (Option.isNone(session)) {
		return yield* new SessionNotFound({ sessionId });
	}
	const refuseSubsession = yield* makeRefuseSubsessionAttach;
	yield* refuseSubsession(sessionId);
	const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(sessionId, session.value.status));
	if (status !== "open") {
		const reach = yield* SessionReach;
		yield* reach.settleWakes(sessionId);
		return yield* new SessionEnded({ sessionId });
	}
	return session.value;
});
