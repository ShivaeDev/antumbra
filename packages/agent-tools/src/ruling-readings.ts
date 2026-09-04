import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const readRulingsSpec = defineTool({
	description: "Read the standing rulings that apply to you, including their questions, context and answers.",
	input: Schema.Struct({
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description: "Additional topics to include. Omit to read only rulings that apply to you.",
			}),
		),
	}),
	name: "read_rulings",
});
