import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { quayChange } from "#rows/quay-change.ts";
export const quay = query("quay", {
	input: {},
	output: Schema.Array(quayChange.Row),
	reads: [quayChange],
	run: Effect.fn("changes.quay")(function* (_input, rows) {
		return (yield* rows.quayChange.where({})).toSorted((left, right) => Date.parse(right.activityAt) - Date.parse(left.activityAt));
	}),
});
