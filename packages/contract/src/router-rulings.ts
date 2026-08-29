import { type AppProcedure, surface } from "#router-procedure.ts";
import {
	ReclassifyRequest,
	RuleRequest,
	RulingReclassifiedReceipt,
	RulingRuledReceipt,
	RulingSupersededReceipt,
	SupersedeRequest,
} from "#rulings/requests.ts";
import { RulingSource } from "#rulings/source.ts";
import { OpenRulingsView, StandingRulingsView } from "#rulings/views.ts";

export const rulingRoutes = (procedure: AppProcedure) => ({
	openRulings: procedure.output(OpenRulingsView).query(function* () {
		const rulings = yield* RulingSource;
		return yield* surface(rulings.open);
	}),
	openRulingsFeed: procedure.output(OpenRulingsView).subscription(function* () {
		const rulings = yield* RulingSource;
		return rulings.openFeed;
	}),
	reclassifyRuling: procedure
		.input(ReclassifyRequest)
		.output(RulingReclassifiedReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.reclassify(input));
		}),
	ruleOn: procedure
		.input(RuleRequest)
		.output(RulingRuledReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.rule(input));
		}),
	standingRulings: procedure.output(StandingRulingsView).query(function* () {
		const rulings = yield* RulingSource;
		return yield* surface(rulings.standing);
	}),
	standingRulingsFeed: procedure
		.output(StandingRulingsView)
		.subscription(function* () {
			const rulings = yield* RulingSource;
			return rulings.standingFeed;
		}),
	supersedeRuling: procedure
		.input(SupersedeRequest)
		.output(RulingSupersededReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.supersede(input));
		}),
});
