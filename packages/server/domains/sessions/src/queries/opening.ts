import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { SessionId } from "#ids.ts";
import { sessionOpening } from "#rows/session-opening.ts";

export const opening = query("opening", {
	input: { id: SessionId },
	output: Schema.NullOr(sessionOpening.Row),
	reads: [sessionOpening],
	run: Effect.fn("Sessions.opening")(function* (input, rows) {
		return Option.getOrNull(yield* rows.sessionOpening.find(input.id));
	}),
});
