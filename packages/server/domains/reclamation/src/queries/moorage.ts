import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { moorage } from "#rows/moorage.ts";

export const current = query("current", {
	input: { agentId: Schema.String },
	output: Schema.Option(moorage.Row),
	reads: [moorage],
});
