import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const closeOpen = Effect.fn("SessionRetirement.closeOpen")(function* (agentId: string) {
	const db = yield* Database;
	yield* db.AgentSession.where({ agentId, status: "open" }).update({ status: "closed" });
});
