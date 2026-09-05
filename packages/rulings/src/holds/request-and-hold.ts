import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Option, PubSub } from "effect";
import type { RulingRequest } from "#acts.ts";
import { makeHolding } from "#holds/holding.ts";
import type { RuledRuling } from "#holds/ruled.ts";
import type { RulingHoldState } from "#holds/state.ts";
import type { Ruling } from "#model.ts";
import { Rulings } from "#rulings.ts";

const ruledOf = (ruling: Ruling): Option.Option<RuledRuling> => Option.map(ruling.answer, (answer) => ({ answer, ruling }));

const untilRuled = Effect.fnUntraced(function* (notices: PubSub.Subscription<void>, rulingId: string) {
	const rulings = yield* Rulings;
	let ruled = ruledOf(yield* rulings.get(rulingId));
	while (Option.isNone(ruled)) {
		yield* PubSub.take(notices);
		ruled = ruledOf(yield* rulings.get(rulingId));
	}
	return ruled.value;
});

export const makeRequestAndHold = (held: RulingHoldState) =>
	Effect.fn("RulingHolds.requestAndHold")(function* (input: RulingRequest) {
		const feeds = yield* DomainFeeds;
		const rulings = yield* Rulings;
		// Subscribe before writing the request so a verdict cannot land before the hold observes its refresh.
		const notices = yield* feeds.subscribeRulingRefresh();
		const requested = yield* rulings.request(input);
		yield* makeHolding(held)(requested.id);
		const ruled = yield* untilRuled(notices, requested.id);
		yield* rulings.markDelivered(requested.id);
		return ruled;
	}, Effect.scoped);
