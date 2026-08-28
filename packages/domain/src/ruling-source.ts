import {
	type ReclassifyRequest,
	type RuleRequest,
	RulingSource,
} from "@antumbra/contract";
import {
	type RulingReclassifyInput,
	Rulings,
	type RulingVerdict,
} from "@antumbra/rulings";
import { Effect, Layer } from "effect";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { rulingSeen } from "#ruling-projection.ts";
import {
	reclassifyFailure,
	toRulingFailure,
	verdictFailure,
} from "#ruling-refusals.ts";

// why: the window is the admiral's hand, so what it sends is ruled by the
// admiral — no other authority sits on the ladder yet. A choice nobody picked
// is left off the verdict rather than carried as an empty one.
const verdictOf = (request: RuleRequest): RulingVerdict =>
	request.choiceId === undefined
		? {
				answer: request.answer,
				by: "admiral",
				rulingId: request.rulingId,
			}
		: {
				answer: request.answer,
				by: "admiral",
				choiceId: request.choiceId,
				rulingId: request.rulingId,
			};

const reclassificationOf = (
	request: ReclassifyRequest,
): RulingReclassifyInput => ({
	by: "admiral",
	rulingId: request.rulingId,
	...(request.note === undefined ? {} : { note: request.note }),
	...(request.radius === undefined ? {} : { radius: request.radius }),
	...(request.urgency === undefined ? {} : { urgency: request.urgency }),
});

export const RulingSourceLive = Layer.effect(RulingSource)(
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const refreshes = yield* makeRulingRefreshes;
		const open = rulings.open().pipe(
			Effect.map((all) => ({ rulings: all.map(rulingSeen) })),
			Effect.mapError(toRulingFailure),
		);
		return {
			open,
			openFeed: refreshes(open),
			reclassify: (request: ReclassifyRequest) =>
				rulings.reclassify(reclassificationOf(request)).pipe(
					Effect.map((moved) => ({ rulingId: moved.id })),
					Effect.mapError(reclassifyFailure),
				),
			rule: (request: RuleRequest) =>
				rulings.rule(verdictOf(request)).pipe(
					Effect.map((ruled) => ({ rulingId: ruled.id })),
					Effect.mapError(verdictFailure),
				),
		};
	}),
);
