import { defineTool } from "@antumbra/platform-tool-schemas/define.ts";
import { RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
export const proclaimRulingSpec = defineTool({
	description: "Record a new standing ruling that applies across the fleet.",
	input: Schema.Struct({
		answer: Schema.String.annotate({
			description: "The decision itself, in the words every voyage will read.",
		}),
		context: Schema.String.annotate({
			description: "The context needed to understand the decision.",
		}),
		question: Schema.String.annotate({
			description: "The question being answered.",
		}),
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description: "Topics that help other agents find the ruling.",
			}),
		),
		urgency: RulingUrgencySchema.annotate({
			description:
				"How badly the fleet needed this settled: `blocking` means work was held for it, `pressing` means work waits on it, `eventual` means nothing waited.",
		}),
	}),
	name: "proclaim_ruling",
});
