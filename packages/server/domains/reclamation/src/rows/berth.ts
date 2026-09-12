import { row } from "@antumbra/platform-feature/row.ts";
import { BerthStatusSchema, ResourceReclaimStateSchema } from "@antumbra/platform-vocabulary/agent-runtime/statuses.ts";
import { Schema } from "effect";
import { BerthId } from "#ids.ts";

export const berth = row(
	"berth",
	{
		id: BerthId,
		agentId: Schema.String,
		runner: Schema.String,
		source: Schema.String,
		slug: Schema.String,
		ref: Schema.String,
		branch: Schema.String,
		path: Schema.String,
		status: BerthStatusSchema,
		reclaimState: Schema.NullOr(ResourceReclaimStateSchema),
		strandedAt: Schema.NullOr(Schema.Number),
	},
	{ key: "id", scope: "agentId" },
);
