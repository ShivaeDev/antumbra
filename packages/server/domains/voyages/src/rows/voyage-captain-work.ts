import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const voyageCaptainWork = row(
	"voyageCaptainWork",
	{
		id: Schema.String,
		voyageId: VoyageId,
		agentId: Schema.String,
		working: Schema.Boolean,
	},
	{ key: "id", scope: "voyageId" },
);
