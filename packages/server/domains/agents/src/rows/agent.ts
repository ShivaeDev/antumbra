import { row } from "@antumbra/platform-feature/row.ts";
import { AgentStatusSchema } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";
import { AgentId } from "#ids.ts";

export const agent = row(
	"agent",
	{
		id: AgentId,
		role: Schema.String,
		status: AgentStatusSchema,
		currentSessionId: Schema.NullOr(Schema.String),
		createdAt: Schema.String,
		updatedAt: Schema.String,
	},
	{ key: "id" },
);
