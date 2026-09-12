import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { sessionUsage } from "#rows/session-usage.ts";
import { UsageTotal } from "#usage/schema.ts";
import { countUsage, emptyTally, totalOf } from "#usage/tally.ts";

export const usageAgent = query("usageAgent", {
	input: { agentId: Schema.String },
	output: UsageTotal,
	reads: [sessionUsage],
	scope: (input) => input.agentId,
	run: Effect.fn("Sessions.usageAgent")(function* (input, rows) {
		const tally = emptyTally();
		for (const reading of yield* rows.sessionUsage.where({ agentId: input.agentId })) countUsage(tally, reading.usage);
		return totalOf(tally);
	}),
});
