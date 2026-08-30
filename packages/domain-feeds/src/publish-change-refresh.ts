import { Effect, PubSub } from "effect";

// why: a request to look at hosts sooner than cadence is a latency hint; a
// lost ring costs one patience period and never changes durable truth.
export const makePublishChangeRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishChangeRefresh")(function* (): Effect.fn.Return<void> {
		yield* PubSub.publish(feed, undefined);
	});
