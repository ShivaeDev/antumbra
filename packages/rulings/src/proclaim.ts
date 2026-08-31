import { DomainFeeds } from "@antumbra/domain-feeds";
import { Clock, Effect } from "effect";
import type { RulingProclamation, RulingRequest, RulingVerdict } from "#acts.ts";
import { RulingChoiceUnknown } from "#errors.ts";
import type { Ruling } from "#model.ts";
import { requested, writeRequest } from "#request.ts";
import { writeVerdict } from "#rule.ts";

const askedOf = (input: RulingProclamation): RulingRequest => ({
	choices: input.choices,
	context: input.context,
	gates: [],
	question: input.question,
	radius: input.radius,
	requester: { by: input.by, kind: "authority" },
	rung: null,
	subjects: input.subjects,
	urgency: input.urgency,
});

const verdictOf = (asked: Ruling, input: RulingProclamation): RulingVerdict => {
	const chosen = input.chosenChoice;
	return chosen === undefined
		? { answer: input.answer, by: input.by, rulingId: asked.id }
		: {
				answer: input.answer,
				by: input.by,
				choiceId: asked.choices.find((choice) => choice.label === chosen)?.id ?? chosen,
				rulingId: asked.id,
			};
};

export const proclaim = Effect.fn("rulings.proclaim")(function* (input: RulingProclamation) {
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const asked = askedOf(input);
	const row = requested(asked, now);
	const chosen = input.chosenChoice;
	if (chosen !== undefined && !input.choices.some((choice) => choice.label === chosen)) {
		return yield* new RulingChoiceUnknown({ choiceId: chosen, rulingId: row.id });
	}
	const open = yield* writeRequest(row, asked);
	const proclaimed = yield* writeVerdict(verdictOf(open, input), new Date(now));
	yield* feeds.publishRulingRefresh();
	return proclaimed;
});
