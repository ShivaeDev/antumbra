import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { AgentId } from "#ids.ts";
export const captainReading = row(
	"captainReading",
	{
		voyageId: VoyageId,
		agentId: Schema.NullOr(AgentId),
		currentSessionId: Schema.NullOr(Schema.String),
		standing: Schema.String,
		atWork: Schema.Boolean,
		canHail: Schema.Boolean,
	},
	{ key: "voyageId" },
);
