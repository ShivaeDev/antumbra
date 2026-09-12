import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Option, Schema } from "effect";
import { AgentId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
export const byId = query("byId", {
	input: { id: AgentId },
	output: Schema.NullOr(agent.Row),
	reads: [agent],
	run: Effect.fn("Agents.byId")(function* (input, rows) {
		return Option.getOrNull(yield* rows.agent.find(input.id));
	}),
});
