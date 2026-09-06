import { Database } from "@antumbra/persistence";
import type { AgentEvent } from "@antumbra/vocabulary/session-events.ts";
import { Effect } from "effect";

type SubsessionOutcome = Extract<AgentEvent, { type: "subsession.ended" }>["outcome"];

export const closeNode = Effect.fn("SessionTreeRows.closeNode")(function* (sessionId: string, outcome: SubsessionOutcome) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ id: sessionId }).update({ outcome, status: "closed" }).pipe(Effect.asVoid);
});
