import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { change } from "#rows/change.ts";
export const publishing = query("publishing", {
	input: {},
	output: Schema.Array(change.Row),
	reads: [change],
	run: Effect.fn("changes.publishing")(function* (_input, rows) {
		return (yield* rows.change.where({ stage: "prepared" })).filter((row) => row.proposalFrozenAt !== null);
	}),
});
