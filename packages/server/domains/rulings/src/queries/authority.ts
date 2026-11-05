import { voyageAgent } from "@antumbra/domain-agents/rows/voyage-agent.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
export const authority = query("authority", {
	input: { agentId: AgentId, voyageId: Schema.NullOr(VoyageId), pieceId: Schema.NullOr(Schema.String) },
	output: Schema.Struct({ by: Schema.Literals(["captain", "flagship"]), rung: RulingAuthoritySchema }),
	reads: [voyageAgent, voyage],
});
