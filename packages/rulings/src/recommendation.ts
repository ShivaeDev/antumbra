import { Effect } from "effect";
import type { RulingChoiceInput, RulingRequest } from "#acts.ts";
import { RulingRecommendationMissing } from "#errors.ts";

const choiceRows = (rulingId: string, choices: ReadonlyArray<RulingChoiceInput>) =>
	choices.map((choice, position) => ({
		detail: choice.detail ?? null,
		id: crypto.randomUUID(),
		label: choice.label,
		position,
		rulingId,
	}));

export const offeredChoices = Effect.fnUntraced(function* (rulingId: string, input: RulingRequest) {
	const recommendation = input.recommendation;
	if (recommendation === undefined) {
		return { recommendedChoiceId: null, rows: choiceRows(rulingId, input.choices) };
	}
	const rows = choiceRows(rulingId, input.choices.length === 0 ? [{ label: recommendation.choice }] : input.choices);
	const recommended = rows.find((row) => row.label === recommendation.choice);
	return recommended === undefined
		? yield* new RulingRecommendationMissing({ choice: recommendation.choice, offered: rows.map((row) => row.label) })
		: { recommendedChoiceId: recommended.id, rows };
});
