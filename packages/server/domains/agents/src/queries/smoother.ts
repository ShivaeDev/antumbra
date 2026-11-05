import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const smoother = query("smoother", {
	input: { voyageId: VoyageId },
	output: Schema.NullOr(agent.Row),
	reads: [agent, voyageAgent],
});
