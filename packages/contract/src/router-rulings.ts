import { type AppProcedure, surface } from "#router-procedure.ts";
import {
	AskMoreRequest,
	ParkRequest,
	ProclaimRequest,
	ReclassifyRequest,
	RuleRequest,
	RulingAskedMoreReceipt,
	RulingParkedReceipt,
	RulingProclaimedReceipt,
	RulingReclassifiedReceipt,
	RulingRuledReceipt,
	RulingSupersededReceipt,
	RulingWithdrawnReceipt,
	SupersedeRequest,
	WithdrawRequest,
} from "#rulings/requests.ts";
import { RulingSource } from "#rulings/source.ts";
import { OpenRulingsView, StandingRulingsView } from "#rulings/views.ts";

export const rulingRoutes = (procedure: AppProcedure) => ({
	askMoreOnRuling: procedure
		.input(AskMoreRequest)
		.output(RulingAskedMoreReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.askMore(input));
		}),
	openRulings: procedure.output(OpenRulingsView).query(function* () {
		const rulings = yield* RulingSource;
		return yield* surface(rulings.open);
	}),
	openRulingsFeed: procedure.output(OpenRulingsView).subscription(function* () {
		const rulings = yield* RulingSource;
		return rulings.openFeed;
	}),
	parkRuling: procedure
		.input(ParkRequest)
		.output(RulingParkedReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.park(input));
		}),
	proclaimRuling: procedure
		.input(ProclaimRequest)
		.output(RulingProclaimedReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.proclaim(input));
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
	standingRulingsFeed: procedure.output(StandingRulingsView).subscription(function* () {
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
	withdrawRuling: procedure
		.input(WithdrawRequest)
		.output(RulingWithdrawnReceipt)
		.mutation(function* (input) {
			const rulings = yield* RulingSource;
			return yield* surface(rulings.withdraw(input));
		}),
});
