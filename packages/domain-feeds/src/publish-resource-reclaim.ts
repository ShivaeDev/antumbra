import { Effect, PubSub } from "effect";

// why: durable truth can become reclaimable without a lifecycle transition;
// this ring reduces latency while boot and cadence recover a missed signal.
export const makePublishResourceReclaim = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishResourceReclaim")(function* (): Effect.fn.Return<void> {
		yield* PubSub.publish(feed, undefined);
	});
