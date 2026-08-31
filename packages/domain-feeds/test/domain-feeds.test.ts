import { DomainFeeds, DomainFeedsLive, type StoredEvent } from "@antumbra/domain-feeds";
import { expect, it } from "@effect/vitest";
import { Effect, PubSub } from "effect";

const event: StoredEvent = {
	kind: "message",
	payload: "charted",
	seq: 1,
	sessionId: "session-1",
};

it.effect("publishes each semantic signal to scoped subscribers", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const changeRefresh = yield* feeds.subscribeChangeRefresh();
			yield* feeds.publishChangeRefresh();
			expect(yield* PubSub.take(changeRefresh)).toBeUndefined();

			const events = yield* feeds.subscribeSessionEvents();
			yield* feeds.publishSessionEvent(event);
			expect(yield* PubSub.take(events)).toEqual(event);

			const fleet = yield* feeds.subscribeFleetRefresh();
			yield* feeds.publishFleetRefresh();
			expect(yield* PubSub.take(fleet)).toBeUndefined();

			const resourceReclaim = yield* feeds.subscribeResourceReclaim();
			yield* feeds.publishResourceReclaim();
			expect(yield* PubSub.take(resourceReclaim)).toBeUndefined();

			const rulings = yield* feeds.subscribeRulingRefresh();
			yield* feeds.publishRulingRefresh();
			expect(yield* PubSub.take(rulings)).toBeUndefined();

			const voyages = yield* feeds.subscribeVoyageRefresh();
			yield* feeds.publishVoyageRefresh();
			expect(yield* PubSub.take(voyages)).toBeUndefined();
		}).pipe(Effect.provide(DomainFeedsLive, { local: true })),
	),
);
