import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const roster = query("roster", {
	input: {},
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
	run: Effect.fn("Agents.roster")(function* (_input, rows) {
		return (yield* rows.agentReading.where({})).toSorted((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
	}),
});
