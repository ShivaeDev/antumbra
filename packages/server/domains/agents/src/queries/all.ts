import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const all = query("all", {
	input: {},
	output: Schema.Array(agent.Row),
	reads: [agent],
	run: Effect.fn("Agents.all")(function* (_input, rows) {
		return yield* rows.agent.where({});
	}),
});
