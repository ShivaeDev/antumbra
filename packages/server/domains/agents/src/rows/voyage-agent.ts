import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { AgentId, VoyageAgentId } from "#ids.ts";

export const voyageAgent = row(
	"voyageAgent",
	{ id: VoyageAgentId, voyageId: VoyageId, agentId: AgentId, role: Schema.String },
	{ key: "id", scope: "voyageId" },
);
