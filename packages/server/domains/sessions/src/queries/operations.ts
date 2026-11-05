import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOperation } from "#rows/session-operation.ts";
export const operations = query("operations", {
	input: { sessionId: SessionId },
	output: Schema.Array(sessionOperation.Row),
	reads: [sessionOperation],
	scope: (input) => input.sessionId,
});
