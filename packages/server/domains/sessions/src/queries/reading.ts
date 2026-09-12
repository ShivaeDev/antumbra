import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";
export const reading = query("reading", {
	input: { id: SessionId },
	output: Schema.NullOr(session.Row),
	reads: [session],
	run: Effect.fn("sessions.reading")(function* (input, rows) {
		return Option.getOrNull(yield* rows.session.find(input.id));
	}),
});
export const tree = query("tree", {
	input: { rootSessionId: SessionId },
	output: Schema.Array(session.Row),
	reads: [session],
	run: Effect.fn("sessions.tree")(function* (input, rows) {
		return yield* rows.session.where({ rootSessionId: input.rootSessionId });
	}),
});
export const forAgent = query("forAgent", {
	input: { agentId: Schema.String },
	output: Schema.Array(session.Row),
	reads: [session],
	scope: (input) => input.agentId,
	run: Effect.fn("sessions.forAgent")(function* (input, rows) {
		return yield* rows.session.where({ agentId: input.agentId });
	}),
});
