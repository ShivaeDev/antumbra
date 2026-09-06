import { Database } from "@antumbra/persistence";
import type { AgentSessionCompleteness } from "@antumbra/vocabulary/agent-runtime.ts";
import { Effect } from "effect";

export const settle = Effect.fn("SessionTreeLedger.settle")(function* (sessionId: string, completeness: AgentSessionCompleteness) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ id: sessionId, completeness: "recording" }).update({ completeness }).pipe(Effect.asVoid);
});
