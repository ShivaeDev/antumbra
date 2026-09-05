import {
	type ProclaimRequest,
	type ReclassifyRequest,
	type RuleRequest,
	RulingSource,
	type SupersedeRequest,
	type WithdrawRequest,
} from "@antumbra/contract";
import { Rulings } from "@antumbra/rulings";
import { Effect, Layer } from "effect";
import { RulingDisplay } from "#ruling-display/service.ts";
import { makeRulingRefreshes } from "#ruling-feed.ts";
import { proclamationOf, reclassificationOf, verdictOf } from "#ruling-inputs.ts";
import { proclaimFailure, reclassifyFailure, toRulingFailure, verdictFailure } from "#ruling-refusals.ts";
import { supersessionFailure } from "#ruling-supersession.ts";
import { withdrawalFailure } from "#ruling-withdrawal.ts";

export const RulingSourceLive = Layer.effect(RulingSource)(
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const display = yield* RulingDisplay;
		const refreshes = yield* makeRulingRefreshes;
		const open = display.open().pipe(Effect.mapError(toRulingFailure));
		const standing = display.standing().pipe(Effect.mapError(toRulingFailure));
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
			withdraw: (request: WithdrawRequest) =>
				rulings.withdraw({ ...request, by: "admiral" }).pipe(Effect.as({ rulingId: request.rulingId }), Effect.mapError(withdrawalFailure)),
		};
	}),
).pipe(Layer.provide(RulingDisplay.layer));
