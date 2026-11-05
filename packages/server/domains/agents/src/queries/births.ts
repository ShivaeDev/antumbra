import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { birth } from "#rows/birth.ts";
export const births = query("births", {
	input: {},
	output: Schema.Array(birth.Row),
	reads: [birth],
});
