import {
	RulingRadiusSchema,
	RulingUrgencySchema,
} from "@antumbra/vocabulary/ruling";
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
	description:
		"Options you are offering, from your recommendation alone to a short list. Whoever rules may answer in free words beside any of them, and you never have to offer any.",
});

export const requestRulingSpec = defineTool({
	description:
		"Request a ruling: a decision that is not yours to make, recorded with the context and question that give the answer its meaning. Ask when a choice belongs to the authority above you, not when you can read the answer off the record. The request lands durably. Declared `blocking`, this call does not return until the ruling lands and then returns the answer itself; declared anything else it returns at once and the answer reaches you as mail, so keep working on everything the ruling does not decide and stop only on what it does.",
	input: Schema.Struct({
		choices: Schema.optional(Choices),
		context: Schema.String.annotate({
			description:
				"The situation behind the question: why you are asking and how the work arrived here. The wider the radius, the richer this must be, because the answer will be read long after you.",
		}),
		gates: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description:
					"Ids of Pieces in your voyage that cannot start until this is ruled. The scheduler holds them until the answer lands, and the admiral sees exactly what the ruling unblocks.",
			}),
		),
		question: Schema.String.annotate({
			description:
				"The question itself, in whatever shape fits: yes or no, choose one, rank, or free prose.",
		}),
		radius: Radius,
		tags: Schema.optional(
			Schema.Array(Schema.String).annotate({
				description:
					"Free tags naming concepts the fleet has no record for, so later askers find this ruling. Your piece, your voyage, and you are already its subjects.",
			}),
		),
		urgency: Urgency,
	}),
	name: "request_ruling",
});
