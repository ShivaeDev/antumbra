import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const voyageActivity = row(
	"voyageActivity",
	{
		id: Schema.String,
		voyageId: VoyageId,
		sourceKind: Schema.Literals(["session", "change"]),
		sourceId: Schema.String,
		at: Schema.String,
	},
	{ key: "id", scope: "voyageId" },
);
