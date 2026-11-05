import { command } from "@antumbra/platform-feature/command.ts";
import { choice, optional, titled } from "@antumbra/platform-feature/edit.ts";
import { Schema } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingAnswered } from "#facts/ruling-answered.ts";
import { RulingId } from "#ids.ts";
import { choices } from "#queries/choices.ts";
import { ruling } from "#rows/ruling.ts";
export const answer = command("answer", {
	input: {
		...rulingAnswered.payload,
		answer: titled(rulingAnswered.payload.answer, { title: "Your answer", multiline: true }),
		choiceId: optional(choice(choices, { input: { rulingId: "rulingId" }, label: "label", value: "id" }), { title: "Chosen option" }),
	},
	reads: [ruling],
	emits: rulingAnswered,
	rejections: {
		...rejections,
		BelowRung: { rulingId: RulingId, rung: Schema.String },
		OutsideAuthority: { rulingId: RulingId, radius: Schema.String },
		ChoiceUnknown: { rulingId: RulingId, choiceId: Schema.String },
	},
});
