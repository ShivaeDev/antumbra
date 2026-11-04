import { query } from "@antumbra/platform-feature/query.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Effect, Option, Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const byId = query("byId", {
	input: { id: AgentId },
	output: Schema.NullOr(agent.Row),
	reads: [agent],
	run: Effect.fn("Agents.byId")(function* (input, rows) {
		return Option.getOrNull(yield* rows.agent.find(input.id));
	}),
});
