import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
export const watchable = query("watchable", {
	input: {},
	output: Schema.Array(change.Row),
	reads: [change],
});
