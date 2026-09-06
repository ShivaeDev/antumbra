import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling.ts";
import { Schema } from "effect";
import { defineTool } from "#define.ts";

const RulingId = Schema.String.annotate({
	description: "The id of the ruling you are acting on, as your mail names it.",
});

export const ruleOnSpec = defineTool({
	description: "Answer an open ruling request. The answer becomes a standing ruling.",
	input: Schema.Struct({
		answer: Schema.String.annotate({
			description: "The answer and its reasoning.",
		}),
		choice: Schema.optional(
			Schema.String.annotate({
				description: "The chosen option label, if choosing an offered option.",
			}),
		),
		rulingId: RulingId,
	}),
	name: "rule_on",
});

export const passUpSpec = defineTool({
	description: "Send a ruling request to the next authority with the context they need to answer.",
	input: Schema.Struct({
		note: Schema.String.annotate({
			description: "Your recommendation and any additional context.",
		}),
		rulingId: RulingId,
	}),
	name: "pass_up",
});

export const reclassifyRulingSpec = defineTool({
	description: "Change a ruling request's radius or urgency. The original classification remains in its history.",
	input: Schema.Struct({
		note: Schema.optional(
			Schema.String.annotate({
				description: "Why you moved it, for whoever answers after you.",
			}),
		),
		radius: Schema.optional(
			RulingRadiusSchema.annotate({
				description:
					"How widely the answer really applies: `piece` binds the work in front of the asker, `voyage` binds one voyage, `fleet` binds every voyage.",
			}),
		),
		rulingId: RulingId,
		urgency: Schema.optional(
			RulingUrgencySchema.annotate({
				description:
					"How badly the answer is really needed: `blocking` holds the asker, `pressing` lets it work on while what the ruling gates waits, `eventual` means nothing waits.",
			}),
		),
	}),
	name: "reclassify_ruling",
});
