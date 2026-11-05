import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { sessionUsage } from "@antumbra/domain-sessions/rows/session-usage.ts";
import { CostsView } from "@antumbra/domain-sessions/rows/usage.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";

export const reading = query("reading", {
	input: { today: Schema.String },
	output: CostsView,
	reads: [sessionUsage, voyageAgent, voyage],
});
