import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const all = query("all", {
	input: {},
	output: Schema.Array(agent.Row),
	reads: [agent],
});
