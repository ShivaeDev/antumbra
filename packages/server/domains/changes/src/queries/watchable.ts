import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { change } from "#rows/change.ts";
export const watchable = query("watchable", {
	input: {},
	output: Schema.Array(change.Row),
	reads: [change],
	run: Effect.fn("changes.watchable")(function* (_input, rows) {
		return yield* rows.change.where({ stage: "open" });
	}),
});
