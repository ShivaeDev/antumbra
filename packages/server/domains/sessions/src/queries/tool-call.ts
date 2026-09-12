import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";
export const toolCall = query("toolCall", {
	input: { sessionId: SessionId, callId: Schema.String },
	output: Schema.NullOr(sessionToolCall.Row),
	reads: [sessionToolCall],
	scope: (input) => input.sessionId,
	run: Effect.fn("Sessions.toolCall")(function* (input, rows) {
		return Option.getOrNull(yield* rows.sessionToolCall.find(`${input.sessionId}:${input.callId}`));
	}),
});
