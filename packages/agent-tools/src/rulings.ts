import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";
import { defineTool } from "#define.ts";

const Radius = RulingRadiusSchema.annotate({
	description:
		"How widely the answer applies once given, and which authority may give it: `piece` binds the work in front of you, `voyage` binds the whole voyage, `fleet` binds every voyage.",
});

const Urgency = RulingUrgencySchema.annotate({
	description:
		"How badly you need the answer: `blocking` means you cannot go on without it and this call holds until it is ruled, `pressing` means you keep working while the work it gates waits, `eventual` means nothing waits.",
});

const Choices = Schema.Array(
	Schema.Struct({
		detail: Schema.optional(
			Schema.String.annotate({
				description: "What choosing this option would mean.",
			}),
		),
		label: Schema.String.annotate({
			description: "One line naming this option.",
		}),
	}),
).annotate({
	description: "Answers to choose among, if there are several.",
});

const Recommendation = Schema.Struct({
	choice: Schema.String.annotate({
		description: "The label of the choice you would make.",
	}),
	reasoning: Schema.String.annotate({
		description: "Why you would make it.",
	}),
}).annotate({
	description: "The answer you would choose, and why.",
});

export const requestRulingSpec = defineTool({
	description:
		"Ask for a decision that is not yours to make, once you can say which answer you would choose and why. A blocking request waits for the answer; other requests return at once and the answer arrives as mail.",
	input: Schema.Struct({
		choices: Schema.optional(Choices),
		context: Schema.String.annotate({
			description: "Context needed to answer the question.",
		}),
		gates: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description: "Pieces in your Voyage that must wait for this decision.",
			}),
		),
		question: Schema.String.annotate({
			description: "The decision you need.",
		}),
		radius: Radius,
		recommendation: Recommendation,
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description: "Additional topics for finding this ruling. Your Agent, Piece and Voyage are included automatically.",
			}),
		),
		urgency: Urgency,
	}),
	name: "request_ruling",
});
