import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
import { Choice, ruling } from "#rows/ruling.ts";
export const choices = query("choices", {
	input: { rulingId: RulingId },
	output: Schema.Array(Choice),
	reads: [ruling],
});
