import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { start } from "#rows/start.ts";
export const admitted = query("admitted", {
	input: {},
	output: Schema.Array(start.Row),
	reads: [start],
	run: Effect.fn("Starts.admitted")(function* (_input, rows) {
		return (yield* rows.start.where({ status: "admitted" })).toSorted(
			(a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id),
		);
	}),
});
