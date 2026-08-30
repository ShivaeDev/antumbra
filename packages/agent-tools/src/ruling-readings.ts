import { Schema } from "effect";
import { defineTool } from "#define.ts";

export const readRulingsSpec = defineTool({
	description:
		"Read the standing rulings that bind you, newest first and in full: the question each one answered, the context behind it, and who ruled. Call it before you ask for a decision, and whenever a ruling named in your charter matters to what you are about to do.",
	input: Schema.Struct({
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description:
					"Extra subject tags to read beside what binds you, for precedent about a concept the fleet has no record for. Omit to read only what binds you.",
			}),
		),
	}),
	name: "read_rulings",
});
