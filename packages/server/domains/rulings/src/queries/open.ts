import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const open = query("open", {
	input: {},
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
