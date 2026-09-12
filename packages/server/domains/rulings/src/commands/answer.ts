import { command } from "@antumbra/platform-feature/command.ts";
import { choice, optional, titled } from "@antumbra/platform-feature/edit.ts";
import { Effect, Option, Schema } from "effect";
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
	run: Effect.fn("rulings.answer")(function* (input, rows, reject) {
		const found = yield* rows.ruling.find(input.rulingId);
		if (Option.isNone(found)) return yield* reject.Unknown({ rulingId: input.rulingId });
		const current = found.value;

		if (current.answer !== null) return yield* reject.AlreadyRuled({ rulingId: input.rulingId });
		const heights = { captain: 0, flagship: 1, admiral: 2 };
		if (current.rung !== null && heights[input.by] < heights[current.rung])
			return yield* reject.BelowRung({ rulingId: input.rulingId, rung: current.rung });
		if (input.by === "captain" && current.radius === "fleet")
			return yield* reject.OutsideAuthority({ rulingId: input.rulingId, radius: current.radius });
		if (input.choiceId !== null && !current.choices.some((choice) => choice.id === input.choiceId))
			return yield* reject.ChoiceUnknown({ rulingId: input.rulingId, choiceId: input.choiceId });
		if (input.answer.length === 0) return yield* reject.Blank({ field: "answer", message: "A ruling needs an answer" });

		return input;
	}),
});
