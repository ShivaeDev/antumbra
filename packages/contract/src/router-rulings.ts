import { type AppProcedure, surface } from "#router-procedure.ts";
import { RulingSource } from "#rulings.ts";
import {
	ReclassifyRequest,
	RuleRequest,
	RulingReclassifiedReceipt,
	RulingRuledReceipt,
} from "#rulings-requests.ts";
import { OpenRulingsView } from "#rulings-views.ts";

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
});
