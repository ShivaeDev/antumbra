import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { nodeSessionsOnly } from "#roots.ts";

export const awaitingAudit = Effect.fn("SessionTreeLedger.awaitingAudit")(function* (rootSessionId: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ completeness: "recording", rootSessionId, status: "closed" }).where(nodeSessionsOnly).all();
});
