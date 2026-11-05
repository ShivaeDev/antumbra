import { query } from "@antumbra/platform-feature/query.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const reading = query("reading", {
	input: { id: SessionInputId, sessionId: Schema.String },
	output: Schema.NullOr(sessionInput.Row),
	reads: [sessionInput],
	scope: (input) => input.sessionId,
});
