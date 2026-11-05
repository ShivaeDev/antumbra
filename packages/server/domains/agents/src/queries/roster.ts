import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const roster = query("roster", {
	input: {},
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
});
