import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionSituation } from "#rows/session-situation.ts";

export const sessionSituations = query("sessionSituations", {
	input: { sessionId: SessionId },
	output: Schema.Array(sessionSituation.Row),
	reads: [sessionSituation],
	run: Effect.fn("changes.sessionSituations")(function* (input, rows) {
		return yield* rows.sessionSituation.where(input);
	}),
});
