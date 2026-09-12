import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { start } from "#rows/start.ts";
export const bySession = query("bySession", {
	input: { sessionId: SessionId },
	output: Schema.NullOr(start.Row),
	reads: [start],
	run: Effect.fn("Starts.bySession")(function* (input, rows) {
		return (yield* rows.start.where({ sessionId: input.sessionId }))[0] ?? null;
	}),
});
