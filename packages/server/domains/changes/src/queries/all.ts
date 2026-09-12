import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { change } from "#rows/change.ts";
export const all = query("all", {
	input: {},
	output: Schema.Array(change.Row),
	reads: [change],
	run: Effect.fn("changes.all")(function* (_input, rows) {
		return yield* rows.change.where({});
	}),
});
