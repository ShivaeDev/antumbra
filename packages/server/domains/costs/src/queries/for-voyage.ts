import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect } from "effect";
import { countUsage, emptyTally, totalOf } from "#queries/tally.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: VoyageId },
	output: UsageTotal,
	reads: [sessionUsage, voyageAgent],
	run: Effect.fn("Costs.forVoyage")(function* (input, rows) {
		const agents = new Set<string>((yield* rows.voyageAgent.where({ voyageId: input.voyageId })).map((crew) => crew.agentId));
		const tally = emptyTally();
		for (const reading of yield* rows.sessionUsage.where({})) if (agents.has(reading.agentId)) countUsage(tally, reading.usage);
		return totalOf(tally);
	}),
});
