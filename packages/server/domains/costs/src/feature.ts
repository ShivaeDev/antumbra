import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { forVoyage } from "#queries/for-voyage.ts";
import { reading } from "#queries/reading.ts";

export const costs = feature("costs", {
	rows: [sessionUsage, voyageAgent, voyage],
	facts: [],
	commands: [],
	materializers: [],
	queries: [reading, forVoyage],
});
