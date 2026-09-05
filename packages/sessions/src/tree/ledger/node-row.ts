import { Database } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { isRootSession } from "#roots.ts";

export const nodeRow = Effect.fn("SessionTreeLedger.nodeRow")(function* (rootSessionId: string, nativeRef: string) {
	const db = yield* Database;
	return yield* db.AgentSession.where({ nativeRef, rootSessionId })
		.first()
		.pipe(Effect.map(Option.flatMap((row) => (isRootSession(row) ? Option.none() : Option.some(row)))));
});
