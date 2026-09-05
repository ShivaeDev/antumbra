import { Database, type StoredAgentSession } from "@antumbra/persistence";
import { Effect, Option } from "effect";

export const rootRow = Effect.fn("SessionTreeRows.rootRow")(function* (sessionId: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ id: sessionId })
		.first()
		.pipe(
			Effect.catchCause((cause) =>
				Effect.logError("the root Session of a subsession could not be read", { sessionId }, cause).pipe(
					Effect.as(Option.none<StoredAgentSession>()),
				),
			),
		);
});
