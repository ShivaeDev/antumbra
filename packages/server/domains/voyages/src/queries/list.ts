import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { voyage } from "#rows/voyage.ts";

export const list = query("list", {
	input: {},
	output: Schema.Array(voyage.Row),
	reads: [voyage],
});
