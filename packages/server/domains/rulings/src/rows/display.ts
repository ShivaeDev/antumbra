import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { ruling } from "#rows/ruling.ts";
export const rulingDisplay = row(
	"rulingDisplay",
	{
		...ruling.fields,
		voyage: Schema.NullOr(Schema.Struct({ id: Schema.String, name: Schema.String })),
		recommendedLabel: Schema.NullOr(Schema.String),
		chosenLabel: Schema.NullOr(Schema.String),
		requesterName: Schema.String,
		rungName: Schema.String,
		subjectLabels: Schema.Array(Schema.Struct({ kind: Schema.String, id: Schema.String, label: Schema.String })),
		speakers: Schema.Record(Schema.String, Schema.String),
		gatedPieces: Schema.Array(Schema.Struct({ id: Schema.String, title: Schema.String, voyageId: Schema.String, voyageName: Schema.String })),
		stale: Schema.Boolean,
	},
	{ key: "id" },
);
export type RulingDisplay = typeof rulingDisplay.Row.Type;
