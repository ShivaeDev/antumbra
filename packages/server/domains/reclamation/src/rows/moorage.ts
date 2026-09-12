import { row } from "@antumbra/platform-feature/row.ts";
import { MoorageStatusSchema, ResourceReclaimStateSchema } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";

export const moorage = row(
	"moorage",
	{
		agentId: Schema.String,
		runner: Schema.String,
		root: Schema.String,
		status: MoorageStatusSchema,
		reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
	},
	{ key: "agentId" },
);
