import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { berth } from "#rows/berth.ts";

export const claims = query("claims", {
	input: {},
	output: Schema.Array(berth.Row),
	reads: [berth],
});
