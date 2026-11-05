import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { quayChange } from "#rows/quay-change.ts";
export const quay = query("quay", {
	input: {},
	output: Schema.Array(quayChange.Row),
	reads: [quayChange],
});
