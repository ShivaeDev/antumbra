import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { UsageTotal } from "@antumbra/domain-sessions/rows/usage.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";

export const forVoyage = query("forVoyage", {
	input: { voyageId: VoyageId },
	output: UsageTotal,
	reads: [sessionUsage, voyageAgent],
});
