import {
	DomainFeeds,
	DomainFeedsLive,
	type StoredEvent,
} from "@antumbra/domain-feeds";
import { describe, expect, it } from "@effect/vitest";
import { Effect, PubSub } from "effect";

const event: StoredEvent = {
	kind: "message",
	payload: "charted",
	seq: 1,
	sessionId: "session-1",
};

describe("DomainFeeds", () => {
	it.effect("publishes each semantic signal to scoped subscribers", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const changeRefresh = yield* feeds.subscribeChangeRefresh();
				const events = yield* feeds.subscribeSessionEvents();
				const fleet = yield* feeds.subscribeFleetRefresh();
				const resourceReclaim = yield* feeds.subscribeResourceReclaim();
				const voyages = yield* feeds.subscribeVoyageRefresh();

				yield* feeds.publishChangeRefresh();
				yield* feeds.publishSessionEvent(event);
				yield* feeds.publishFleetRefresh();
				yield* feeds.publishResourceReclaim();
				yield* feeds.publishVoyageRefresh();

				expect(yield* PubSub.take(changeRefresh)).toBeUndefined();
				expect(yield* PubSub.take(events)).toEqual(event);
				expect(yield* PubSub.take(fleet)).toBeUndefined();
				expect(yield* PubSub.take(resourceReclaim)).toBeUndefined();
				expect(yield* PubSub.take(voyages)).toBeUndefined();
			}).pipe(Effect.provide(DomainFeedsLive, { local: true })),
		),
	);

	it.effect("fans one voyage refresh out to every subscriber", () =>
		Effect.scoped(
			Effect.gen(function* () {
				const feeds = yield* DomainFeeds;
				const first = yield* feeds.subscribeVoyageRefresh();
				const second = yield* feeds.subscribeVoyageRefresh();

				yield* feeds.publishVoyageRefresh();

				expect(yield* PubSub.take(first)).toBeUndefined();
				expect(yield* PubSub.take(second)).toBeUndefined();
			}).pipe(Effect.provide(DomainFeedsLive, { local: true })),
		),
	);
});
