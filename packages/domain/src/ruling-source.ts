import {
	type ProclaimRequest,
	type ReclassifyRequest,
	type RuleRequest,
	RulingFailure,
	RulingSource,
	type StandingRulingsView,
	type SupersedeRequest,
} from "@antumbra/contract";
import {
	type Ruling,
	type RulingProclamation,
	type RulingReclassifyInput,
	Rulings,
	type RulingVerdict,
} from "@antumbra/rulings";
import { Effect, Layer, Option } from "effect";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { choiceOf, tagSubjects } from "#ruling-inputs.ts";
import { rulingSeen, standingRulingSeen } from "#ruling-projection.ts";
import {
	proclaimFailure,
	reclassifyFailure,
	toRulingFailure,
	verdictFailure,
} from "#ruling-refusals.ts";
import { supersessionFailure } from "#ruling-supersession.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

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

// why: the admiral proclaiming from the window is the asker as well as the
// authority, and it stands on no piece or voyage while it writes a rule — so
// free tags are the whole of the scope a proclamation may name.
const proclamationOf = (request: ProclaimRequest): RulingProclamation => ({
	answer: request.answer,
	by: "admiral",
	choices: (request.choices ?? []).map(choiceOf),
	context: request.context,
	question: request.question,
	radius: request.radius,
	subjects: tagSubjects(request.tags),
	urgency: request.urgency,
	...(request.chosenChoice === undefined
		? {}
		: { chosenChoice: request.chosenChoice }),
});

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
		const world = yield* VoyageWorldSource;
		const refreshes = yield* makeRulingRefreshes;
		const open = Effect.all({ open: rulings.open(), rows: world.read }).pipe(
			Effect.map(({ open, rows }) => ({
				rulings: open.map((ruling) => rulingSeen(ruling, rows)),
			})),
			Effect.mapError(toRulingFailure),
		);
		const standing = rulings.standing([]).pipe(
			Effect.mapError(toRulingFailure),
			Effect.flatMap((all) => Effect.forEach(all, standingSeen)),
			Effect.map((seen) => ({ rulings: seen })),
		);
		return {
			open,
			openFeed: refreshes(open),
			proclaim: (request: ProclaimRequest) =>
				rulings.proclaim(proclamationOf(request)).pipe(
					Effect.map((proclaimed) => ({ rulingId: proclaimed.id })),
					Effect.mapError(proclaimFailure),
				),
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
