import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const workingCount = query("workingCount", {
	input: {},
	output: Schema.Number,
	reads: [agentReading],
});
