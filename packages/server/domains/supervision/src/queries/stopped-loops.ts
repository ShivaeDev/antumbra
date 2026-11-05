import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { stoppedLoop } from "#rows/stopped-loop.ts";

export const stoppedLoops = query("stoppedLoops", {
	input: {},
	output: Schema.Array(stoppedLoop.Row),
	reads: [stoppedLoop],
});
