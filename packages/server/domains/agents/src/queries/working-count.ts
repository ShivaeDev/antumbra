import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const workingCount = query("workingCount", {
	input: {},
	output: Schema.Number,
	reads: [agentReading],
	run: Effect.fn("Agents.workingCount")(function* (_input, rows) {
		return yield* rows.agentReading.count({ canInterrupt: true });
	}),
});
