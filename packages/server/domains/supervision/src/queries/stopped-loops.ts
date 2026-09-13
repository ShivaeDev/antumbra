import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const stoppedLoops = query("stoppedLoops", {
	input: {},
	output: Schema.Array(stoppedLoop.Row),
	reads: [stoppedLoop],
	run: Effect.fn("supervision.stoppedLoops")(function* (_input, rows) {
		const held = yield* rows.stoppedLoop.where({});
		return [...held].sort((left, right) => right.at - left.at);
	}),
});
