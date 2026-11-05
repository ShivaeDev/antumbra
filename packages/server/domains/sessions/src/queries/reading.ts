import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
export const reading = query("reading", {
	input: { id: SessionId },
	output: Schema.NullOr(session.Row),
	reads: [session],
});
export const forAgent = query("forAgent", {
	input: { agentId: Schema.String },
	output: Schema.Array(session.Row),
	reads: [session],
	scope: (input) => input.agentId,
});
