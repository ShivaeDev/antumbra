import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { capacity } from "#rows/capacity.ts";

export const providers = query("providers", {
	input: {},
	output: Schema.Array(capacity.Row),
	reads: [capacity],
});
