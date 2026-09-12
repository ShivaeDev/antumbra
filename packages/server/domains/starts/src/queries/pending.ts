import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { start } from "#rows/start.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(start.Row),
	reads: [start],
	run: Effect.fn("Starts.pending")(function* (_input, rows) {
		return (yield* rows.start.where({ status: "requested" })).toSorted(
			(a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id),
		);
	}),
});
