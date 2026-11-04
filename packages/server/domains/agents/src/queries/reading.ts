import { query } from "@antumbra/platform-feature/query.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Effect, Option, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const reading = query("reading", {
	input: { id: AgentId },
	output: Schema.NullOr(agentReading.Row),
	reads: [agentReading],
	run: Effect.fn("Agents.reading")(function* (input, rows) {
		return Option.getOrNull(yield* rows.agentReading.find(input.id));
	}),
});
