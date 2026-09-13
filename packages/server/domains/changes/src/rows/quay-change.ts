import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
export const QuayPiece = Schema.Struct({ id: Schema.String, title: Schema.String, voyageId: Schema.String, voyageName: Schema.String });
export const quayChange = row(
	"quayChange",
	{
		...change.fields,
		repoName: Schema.String,
		group: Schema.Literals(["alongside", "checksRunning", "draft", "landed", "needsAttention"]),
		pieces: Schema.Array(QuayPiece),
	},
	{ key: "id" },
);
