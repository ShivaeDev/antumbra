import { Database } from "@antumbra/persistence";
import { rootSessions } from "@antumbra/sessions";
import { Effect } from "effect";
import { decodeRootSession } from "#execution/decode-session.ts";
export const readRootSessions = Effect.fnUntraced(function* () {
	const db = yield* Database;
	return yield* Effect.forEach(yield* db.AgentSession.where(rootSessions).all(), decodeRootSession);
});
