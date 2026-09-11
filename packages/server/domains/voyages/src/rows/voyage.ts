import { row } from "@antumbra/platform-feature/row.ts";
import { VoyageKindSchema } from "@antumbra/platform-vocabulary/voyage.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const voyage = row(
	"voyage",
	{
		id: VoyageId,
		kind: VoyageKindSchema,
		name: Schema.String,
		northStar: Schema.String,
		context: Schema.String,
		focusedAt: Schema.NullOr(Schema.String),
		openedAt: Schema.String,
	},
	{ key: "id" },
);
