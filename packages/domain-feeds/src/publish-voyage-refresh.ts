import { Effect, PubSub } from "effect";

export const makePublishVoyageRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishVoyageRefresh")(function* (): Effect.fn.Return<void> {
		yield* PubSub.publish(feed, undefined);
	});
