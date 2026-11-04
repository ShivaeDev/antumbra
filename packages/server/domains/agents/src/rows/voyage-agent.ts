import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { AgentId, VoyageAgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";

export const voyageAgent = row(
	"voyageAgent",
	{ id: VoyageAgentId, voyageId: VoyageId, agentId: AgentId, role: Schema.String },
	{ key: "id", scope: "voyageId" },
);
