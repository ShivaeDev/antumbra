import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { AgentId } from "@antumbra/platform-vocabulary/agents-ids.ts";
import { Schema } from "effect";
import { agent } from "#rows/agent.ts";
export const captainReading = row(
	"captainReading",
	{
		voyageId: VoyageId,
		agentId: Schema.NullOr(AgentId),
		currentSessionId: Schema.NullOr(Schema.String),
		standing: Schema.String,
		status: Schema.NullOr(agent.fields.status),
		atWork: Schema.Boolean,
		canHail: Schema.Boolean,
	},
	{ key: "voyageId" },
);
