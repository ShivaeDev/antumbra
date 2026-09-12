import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { countUsage, emptyTally, totalOf } from "#queries/tally.ts";

export const forAgent = query("forAgent", {
	input: { agentId: Schema.String },
	output: UsageTotal,
	reads: [sessionUsage],
	scope: (input) => input.agentId,
	run: Effect.fn("Costs.forAgent")(function* (input, rows) {
		const tally = emptyTally();
		for (const reading of yield* rows.sessionUsage.where({ agentId: input.agentId })) countUsage(tally, reading.usage);
		return totalOf(tally);
	}),
});
