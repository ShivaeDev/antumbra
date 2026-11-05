import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { voyageAgent } from "#rows/voyage-agent.ts";
export const authority = query("authority", {
	input: { agentId: AgentId, voyageId: Schema.NullOr(VoyageId), pieceId: Schema.NullOr(PieceId) },
	output: Schema.Struct({
		role: Schema.String,
		flagship: Schema.Boolean,
		rulesAs: Schema.Literals(["flagship", "captain"]),
		rungAsked: Schema.Literals(["admiral", "flagship", "captain"]),
	}),
	reads: [voyageAgent, voyage],
});
