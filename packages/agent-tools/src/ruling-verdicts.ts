import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/vocabulary/ruling";
import { Schema } from "effect";
import { defineTool } from "#define.ts";

const RulingId = Schema.String.annotate({
	description: "The id of the ruling you are acting on, as your mail names it.",
});

export const ruleOnSpec = defineTool({
	description:
		"Rule on a ruling that has climbed to you: settle a question an agent asked. Your answer stands from the moment you give it and is read long after the work that asked for it, so answer the question that was actually asked and say how far the answer reaches. Rule only what is yours: a question whose answer would bind more widely than you may bind, or that you cannot settle, goes up with `pass_up` and whatever context you can add.",
	input: Schema.Struct({
		answer: Schema.String.annotate({
			description: "The decision itself, in the words the asker and every later reader will read.",
		}),
		choice: Schema.optional(
			Schema.String.annotate({
				description: "The label of one of the choices the asker offered, when your answer is one of them. Your own words stand beside it either way.",
			}),
		),
		rulingId: RulingId,
	}),
	name: "rule_on",
});

export const passUpSpec = defineTool({
	description:
		"Pass a ruling that waits on you up to the authority above you: your captain's questions go to the flagship, the flagship's go to the admiral. Use it when the answer is not yours to give — because it would bind more widely than you may bind, or because you do not have what it takes to settle it. What you write is appended to the record beside the asker's own words, so the question arrives above you richer than it reached you.",
	input: Schema.Struct({
		note: Schema.String.annotate({
			description:
				"What you know that the asker did not: what you would recommend, what you have already ruled out, and why this is not yours to settle.",
		}),
		rulingId: RulingId,
	}),
	name: "pass_up",
});

export const reclassifyRulingSpec = defineTool({
	description:
		"Move a ruling's radius, its urgency, or both. The asker declared how widely the answer would apply and how badly it was needed; you see the fleet it lands in. Your word is appended beside the asker's and never over it, and the radius you set decides who may answer from here on.",
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
