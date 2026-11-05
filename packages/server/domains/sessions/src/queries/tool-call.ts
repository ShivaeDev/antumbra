import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionToolCall } from "#rows/session-tool-call.ts";
export const toolCall = query("toolCall", {
	input: { sessionId: SessionId, callId: Schema.String },
	output: Schema.NullOr(sessionToolCall.Row),
	reads: [sessionToolCall],
	scope: (input) => input.sessionId,
});
