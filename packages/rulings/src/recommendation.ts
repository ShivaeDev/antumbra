import { Effect } from "effect";
import type { RulingChoiceInput, RulingRequest } from "#acts.ts";
import { RulingRecommendationMissing } from "#errors.ts";

interface ChoiceRow {
	readonly detail: string | null;
	readonly id: string;
	readonly label: string;
	readonly position: number;
	readonly rulingId: string;
}

interface OfferedChoices {
	readonly recommendedChoiceId: string | null;
	readonly rows: ReadonlyArray<ChoiceRow>;
}

const choiceRows = (rulingId: string, choices: ReadonlyArray<RulingChoiceInput>): ReadonlyArray<ChoiceRow> =>
	choices.map((choice, position) => ({
		detail: choice.detail ?? null,
		id: crypto.randomUUID(),
		label: choice.label,
		position,
		rulingId,
	}));

export const offeredChoices = (rulingId: string, input: RulingRequest): Effect.Effect<OfferedChoices, RulingRecommendationMissing> =>
	Effect.gen(function* () {
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
