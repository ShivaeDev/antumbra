import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { birth } from "#rows/birth.ts";
export const birthBySession = query("birthBySession", {
	input: { sessionId: SessionId },
	output: Schema.NullOr(birth.Row),
	reads: [birth],
	run: Effect.fn("Agents.birthBySession")(function* (input, rows) {
		return (yield* rows.birth.where({ sessionId: input.sessionId }))[0] ?? null;
	}),
});
