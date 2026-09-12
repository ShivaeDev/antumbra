import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { birth } from "#rows/birth.ts";
export const births = query("births", {
	input: {},
	output: Schema.Array(birth.Row),
	reads: [birth],
	run: Effect.fn("Agents.births")(function* (_input, rows) {
		return yield* rows.birth.where({});
	}),
});
