import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const markIncomplete = Effect.fn("SessionTreeRows.markIncomplete")(function* (sessionId: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ id: sessionId })
		.update({
			completeness: "incomplete",
		})
		.pipe(
			Effect.asVoid,
			Effect.catchCause((cause) => Effect.logError("session completeness could not be marked incomplete", { sessionId }, cause)),
		);
});
