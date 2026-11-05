import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const byId = query("byId", {
	input: { id: RulingId },
	output: Schema.Option(ruling.Row),
	reads: [ruling],
});
