import {
	type ProclaimRequest,
	type ReclassifyRequest,
	type RuleRequest,
	RulingFailure,
	RulingSource,
	type StandingRulingsView,
	type SupersedeRequest,
	type WithdrawRequest,
} from "@antumbra/contract";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect, Layer, Option } from "effect";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { proclamationOf, reclassificationOf, verdictOf } from "#ruling-inputs.ts";
import { rulingSeen, standingRulingSeen } from "#ruling-projection.ts";
import { proclaimFailure, reclassifyFailure, toRulingFailure, verdictFailure } from "#ruling-refusals.ts";
import { makeRulingReplies } from "#ruling-replies.ts";
import { rulingStaleness } from "#ruling-staleness.ts";
import { supersessionFailure } from "#ruling-supersession.ts";
import { withdrawalFailure } from "#ruling-withdrawal.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

const standingSeen = (ruling: Ruling, stale: boolean): Effect.Effect<StandingRulingsView["rulings"][number], RulingFailure> =>
	Option.match(ruling.answer, {
		onNone: () =>
			new RulingFailure({
				message: `ruling ${ruling.id} stands without an answer`,
			}),
		onSome: (answer) => Effect.succeed(standingRulingSeen(ruling, answer, stale)),
	});

export const RulingSourceLive = Layer.effect(RulingSource)(
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const world = yield* VoyageWorldSource;
		const refreshes = yield* makeRulingRefreshes;
		const replies = yield* makeRulingReplies;
		const open = Effect.all({ open: rulings.open(), rows: world.read() }).pipe(
			Effect.map(({ open, rows }) => ({
				rulings: open.map((ruling) => rulingSeen(ruling, rows)),
			})),
			Effect.mapError(toRulingFailure),
		);
		const standing = Effect.all({
			ruled: rulings.standing([]),
			rows: world.read(),
		}).pipe(
			Effect.mapError(toRulingFailure),
			Effect.flatMap(({ ruled, rows }) => {
				const stale = rulingStaleness(rows);
				return Effect.forEach(ruled, (ruling) => standingSeen(ruling, stale(ruling)));
			}),
			Effect.map((seen) => ({ rulings: seen })),
		);
		return {
			askMore: replies.askMore,
			open,
			openFeed: refreshes(open),
			park: replies.park,
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
			withdraw: (request: WithdrawRequest) =>
				rulings.withdraw({ ...request, by: "admiral" }).pipe(Effect.as({ rulingId: request.rulingId }), Effect.mapError(withdrawalFailure)),
		};
	}),
);
