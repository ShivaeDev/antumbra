import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { VoyageId } from "#ids.ts";

export const voyageProgress = row(
	"voyageProgress",
	{
		id: VoyageId,
		counts: Schema.Struct({
			abandoned: Schema.Number,
			active: Schema.Number,
			blocked: Schema.Number,
			done: Schema.Number,
			held: Schema.Number,
			landing: Schema.Number,
			parked: Schema.Number,
			ready: Schema.Number,
		}),
		state: Schema.Literals(["quiet", "underWay"]),
		concluded: Schema.Boolean,
	},
	{ key: "id" },
);
