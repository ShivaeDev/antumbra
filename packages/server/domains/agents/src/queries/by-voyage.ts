import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const byVoyage = query("byVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
	run: Effect.fn("Agents.byVoyage")(function* (input, rows) {
		return (yield* rows.agentReading.where({})).filter((held) => held.voyageIds.includes(input.voyageId));
	}),
});
