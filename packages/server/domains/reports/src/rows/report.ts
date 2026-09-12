import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { ReportId } from "#ids.ts";

export const report = row(
	"report",
	{
		id: ReportId,
		authorAgentId: Schema.NullOr(Schema.String),
		title: Schema.String,
		body: Schema.String,
		createdAt: Schema.String,
	},
	{ key: "id" },
);
