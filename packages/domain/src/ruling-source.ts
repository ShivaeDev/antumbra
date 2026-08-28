import {
	type RuleRequest,
	RulingFailure,
	RulingRefused,
	RulingSource,
} from "@antumbra/contract";
import {
	Rulings,
	type RulingVerdict,
	type RulingVerdictFailure,
} from "@antumbra/rulings";
import { Effect, Layer } from "effect";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { rulingSeen } from "#ruling-projection.ts";
import { failureMessage } from "#sight-failure.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

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

export const RulingSourceLive = Layer.effect(RulingSource)(
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const world = yield* VoyageWorldSource;
		const refreshes = yield* makeRulingRefreshes;
		const open = Effect.all({ open: rulings.open(), rows: world.read }).pipe(
			Effect.map(({ open, rows }) => ({
				rulings: open.map((ruling) => rulingSeen(ruling, rows)),
			})),
			Effect.mapError(toFailure),
		);
		return {
			open,
			openFeed: refreshes(open),
			rule: (request: RuleRequest) =>
				rulings.rule(verdictOf(request)).pipe(
					Effect.map((ruled) => ({ rulingId: ruled.id })),
					Effect.mapError(verdictFailure),
				),
		};
	}),
);
