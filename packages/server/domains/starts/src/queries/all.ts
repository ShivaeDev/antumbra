import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { start } from "#rows/start.ts";
export const all = query("all", {
	input: {},
	output: Schema.Array(start.Row),
	reads: [start],
	run: Effect.fn("Starts.all")(function* (_input, rows) {
		return yield* rows.start.where({});
	}),
});
