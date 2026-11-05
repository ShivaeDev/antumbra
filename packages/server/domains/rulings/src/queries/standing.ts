import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { ruling, Subject } from "#rows/ruling.ts";
export const standing = query("standing", {
	input: { subjects: Schema.Array(Subject) },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
