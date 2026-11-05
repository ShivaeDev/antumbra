import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { sessionInput } from "#rows/input.ts";
export const pending = query("pending", {
	input: {},
	output: Schema.Array(sessionInput.Row),
	reads: [sessionInput],
});
