import {
	type RuleRequest,
	RulingFailure,
	RulingRefused,
	RulingSource,
	type StandingRulingsView,
	type SupersedeRequest,
} from "@antumbra/contract";
import {
	type Ruling,
	Rulings,
	type RulingVerdict,
	type RulingVerdictFailure,
} from "@antumbra/rulings";
import { Effect, Layer, Option } from "effect";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { rulingSeen, standingRulingSeen } from "#ruling-projection.ts";
import { supersessionFailure } from "#ruling-supersession.ts";
import { failureMessage } from "#sight-failure.ts";

const toFailure = (cause: unknown): RulingFailure =>
	new RulingFailure({ message: failureMessage(cause) });

// why: the three ways a verdict fails to land are things the record knows and
// the window does not, so each comes back as the sentence that says which —
// anything else is this process failing rather than the request being wrong.
const verdictFailure = (
	cause: RulingVerdictFailure,
): RulingFailure | RulingRefused => {
	switch (cause._tag) {
		case "RulingAlreadyRuled":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} was already ruled`,
			});
		case "RulingChoiceUnknown":
			return new RulingRefused({
				reason: `ruling ${cause.rulingId} never offered choice ${cause.choiceId}`,
			});
		case "RulingNotFound":
			return new RulingRefused({ reason: `no open ruling: ${cause.rulingId}` });
		default:
			return toFailure(cause);
	}
};

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

// why: the standing set is ruled by construction, so a ruling met there with
// no answer is the record contradicting itself rather than a view to skip.
const standingSeen = (
	ruling: Ruling,
): Effect.Effect<StandingRulingsView["rulings"][number], RulingFailure> =>
	Option.match(ruling.answer, {
		onNone: () =>
			new RulingFailure({
				message: `ruling ${ruling.id} stands without an answer`,
			}),
		onSome: (answer) => Effect.succeed(standingRulingSeen(ruling, answer)),
	});

export const RulingSourceLive = Layer.effect(RulingSource)(
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const refreshes = yield* makeRulingRefreshes;
		const open = rulings.open().pipe(
			Effect.map((all) => ({ rulings: all.map(rulingSeen) })),
			Effect.mapError(toFailure),
		);
		const standing = rulings.standing([]).pipe(
			Effect.mapError(toFailure),
			Effect.flatMap((all) => Effect.forEach(all, standingSeen)),
			Effect.map((seen) => ({ rulings: seen })),
		);
		return {
			open,
			openFeed: refreshes(open),
			rule: (request: RuleRequest) =>
				rulings.rule(verdictOf(request)).pipe(
					Effect.map((ruled) => ({ rulingId: ruled.id })),
					Effect.mapError(verdictFailure),
				),
			standing,
			standingFeed: refreshes(standing),
			supersede: (request: SupersedeRequest) =>
				rulings.supersede({ ...request, by: "admiral" }).pipe(
					Effect.as({
						byRulingId: request.byRulingId,
						rulingId: request.rulingId,
					}),
					Effect.mapError(supersessionFailure),
				),
		};
	}),
);
