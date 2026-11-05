import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const replacements = query("replacements", {
	input: { rulingId: RulingId },
	output: Schema.Array(ruling.Row),
	reads: [ruling],
});
