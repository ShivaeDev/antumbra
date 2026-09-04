import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const readReportSpec = defineTool({
	description: "Read a landed Report in full by ID.",
	input: Schema.Struct({
		reportId: Schema.String.annotate({
			description: "The id of a report landed on your voyage, as `read_voyage` shows it.",
		}),
	}),
	name: "read_report",
});
