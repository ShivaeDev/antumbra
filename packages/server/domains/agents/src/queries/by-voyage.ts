import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
export const byVoyage = query("byVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(agentReading.Row),
	reads: [agentReading],
});
