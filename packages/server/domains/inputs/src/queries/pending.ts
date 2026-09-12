import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(sessionInput.Row),
	reads: [sessionInput],
	run: Effect.fn("inputs.pending")(function* (_input, rows) {
		return yield* rows.sessionInput.where({ status: "pending" });
	}),
});
