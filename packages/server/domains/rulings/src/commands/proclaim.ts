import { command } from "@antumbra/platform-feature/command.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Effect, Schema } from "effect";
import { requestInput } from "#commands/inputs.ts";
import { missingSubject, subjectRows } from "#commands/request.ts";
import { rulingProclaimed } from "#facts/ruling-proclaimed.ts";
import { RulingId } from "#ids.ts";
import { Subject } from "#rows/ruling.ts";
export const proclaim = command("proclaim", {
	input: { ...requestInput, by: RulingAuthoritySchema, answer: Schema.NonEmptyString, chosenChoice: Schema.NullOr(Schema.String) },
	reads: subjectRows,
	emits: rulingProclaimed,
	rejections: { SubjectMissing: { subject: Subject }, ChoiceUnknown: { choice: Schema.String }, OutsideAuthority: { radius: Schema.String } },
	run: Effect.fn("rulings.proclaim")(function* (input, rows, reject) {
		const missing = yield* missingSubject(input.subjects, rows);
		if (missing !== null) return yield* reject.SubjectMissing({ subject: missing });
		if (input.by === "captain" && input.radius === "fleet") return yield* reject.OutsideAuthority({ radius: input.radius });
		if (input.chosenChoice !== null && !input.choices.some((choice) => choice.label === input.chosenChoice))
			return yield* reject.ChoiceUnknown({ choice: input.chosenChoice });
		return { id: RulingId.make(input.requestId), ...input };
	}),
});
