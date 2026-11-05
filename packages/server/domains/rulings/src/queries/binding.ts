import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { ruling, Subject } from "#rows/ruling.ts";
export const binding = query("binding", {
	input: { subjects: Schema.Array(Subject) },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
