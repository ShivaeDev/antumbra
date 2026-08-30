import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const readReportSpec = defineTool({
	description:
		"Read a landed report in full: its title, who wrote it, and everything it says. Call it whenever a report on your voyage is named and you need what is in it.",
	input: Schema.Struct({
		reportId: Schema.String.annotate({
			description: "The id of a report landed on your voyage, as `read_voyage` shows it.",
		}),
	}),
	name: "read_report",
});
