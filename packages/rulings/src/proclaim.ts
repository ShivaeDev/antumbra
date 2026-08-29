import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Effect } from "effect";
import type {
	Ruling,
	RulingProclamation,
	RulingRequest,
	RulingVerdict,
} from "#model.ts";
import { requested, writeRequest } from "#request.ts";
import { writeVerdict } from "#rule.ts";

const askedOf = (input: RulingProclamation): RulingRequest => ({
	choices: input.choices,
	context: input.context,
	gates: [],
	question: input.question,
	radius: input.radius,
	requester: { by: input.by, kind: "authority" },
	subjects: input.subjects,
	urgency: input.urgency,
});

// why: a pick is named by its label because no choice had an id when the
// proclamation was written. A label matching none of them travels on as it
// stands, so the verdict refuses it the way it refuses any choice never offered.
const verdictOf = (asked: Ruling, input: RulingProclamation): RulingVerdict => {
	const chosen = input.chosenChoice;
	return chosen === undefined
		? { answer: input.answer, by: input.by, rulingId: asked.id }
		: {
				answer: input.answer,
				by: input.by,
				choiceId:
					asked.choices.find((choice) => choice.label === chosen)?.id ?? chosen,
				rulingId: asked.id,
			};
};

const writeProclamation = (input: RulingProclamation, at: Date) =>
	Effect.gen(function* () {
		const asked = askedOf(input);
		const open = yield* writeRequest(requested(asked, at.getTime()), asked);
		return yield* writeVerdict(verdictOf(open, input), at);
	});

// why: an authority wanting a standing rule asks and answers one ruling in a
// single write, so it stands the moment it is proclaimed and nobody ever meets
// the question open. The request and the verdict keep their own refusals, and
// a proclamation gates no piece, so no readiness moves with it.
export const proclaim = Effect.fn("rulings.proclaim")(function* (
	input: RulingProclamation,
) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const now = yield* Clock.currentTimeMillis;
	const proclaimed = yield* db.transaction(
		writeProclamation(input, new Date(now)),
	);
	yield* feeds.publishRulingRefresh();
	return proclaimed;
});
