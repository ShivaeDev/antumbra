import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { nodeSessionsOnly } from "#roots.ts";

export const nodeRows = Effect.fn("SessionTreeLedger.nodeRows")(function* (rootSessionId: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ rootSessionId }).where(nodeSessionsOnly).all();
});
