import { query } from "@antumbra/platform-feature/query.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, Option, Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const reading = query("reading", {
	input: { id: SessionInputId, sessionId: Schema.String },
	output: Schema.NullOr(sessionInput.Row),
	reads: [sessionInput],
	scope: (input) => input.sessionId,
	run: Effect.fn("inputs.reading")(function* (input, rows) {
		const held = yield* rows.sessionInput.find(input.id);
		return Option.isSome(held) && held.value.sessionId === input.sessionId ? held.value : null;
	}),
});
