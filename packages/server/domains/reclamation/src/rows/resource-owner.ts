import { row } from "@antumbra/platform-feature/row.ts";
import { AgentStatusSchema } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";

export const resourceOwner = row(
	"resourceOwner",
	{
		agentId: Schema.String,
		status: AgentStatusSchema,
		openSessions: Schema.Number,
	},
	{ key: "agentId" },
);
