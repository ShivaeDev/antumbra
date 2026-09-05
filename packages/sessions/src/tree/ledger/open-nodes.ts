import { Database } from "@antumbra/persistence";
import { Effect } from "effect";
import { nodeSessionsOnly, openSessions } from "#roots.ts";

export const openNodes = Effect.fn("SessionTreeLedger.openNodes")(function* () {
	const db = yield* Database;
	return yield* db.AgentSession.where(openSessions).where(nodeSessionsOnly).all();
});
