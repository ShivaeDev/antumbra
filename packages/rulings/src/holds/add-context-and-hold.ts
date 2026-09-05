import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import type { RulingContextInput } from "#acts.ts";
import { admiralAsks } from "#holds/admiral-asks.ts";
import { makeHolding } from "#holds/holding.ts";
import { settledAfter } from "#holds/settled.ts";
import type { RulingHoldState } from "#holds/state.ts";
import { Rulings } from "#rulings.ts";

export const makeAddContextAndHold = (held: RulingHoldState) =>
	Effect.fn("RulingHolds.addContextAndHold")(function* (input: RulingContextInput) {
		const feeds = yield* DomainFeeds;
		const rulings = yield* Rulings;
		// Subscribe before appending so a verdict cannot land before the hold observes its refresh.
		const notices = yield* feeds.subscribeRulingRefresh();
		const extended = yield* rulings.addContext(input);
		yield* makeHolding(held)(extended.id);
		return yield* settledAfter(notices, extended.id, admiralAsks(extended).length);
	}, Effect.scoped);
