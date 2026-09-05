import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect } from "effect";
import type { RulingRequest } from "#acts.ts";
import { makeHolding } from "#holds/holding.ts";
import { settledAfter } from "#holds/settled.ts";
import type { RulingHoldState } from "#holds/state.ts";
import { Rulings } from "#rulings.ts";

export const makeRequestAndHold = (held: RulingHoldState) =>
	Effect.fn("RulingHolds.requestAndHold")(function* (input: RulingRequest) {
		const feeds = yield* DomainFeeds;
		const rulings = yield* Rulings;
		// Subscribe before writing the request so a verdict cannot land before the hold observes its refresh.
		const notices = yield* feeds.subscribeRulingRefresh();
		const requested = yield* rulings.request(input);
		yield* makeHolding(held)(requested.id);
		return yield* settledAfter(notices, requested.id, 0);
	}, Effect.scoped);
