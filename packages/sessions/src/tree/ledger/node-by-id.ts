import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { nodeSessionsOnly } from "#roots.ts";

export const nodeById = Effect.fn("SessionTreeLedger.nodeById")(function* (rootSessionId: string, id: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ id, rootSessionId }).where(nodeSessionsOnly).first();
});
