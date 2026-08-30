import { Effect, PubSub } from "effect";

export const makePublishRulingRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishRulingRefresh")(function* (): Effect.fn.Return<void> {
		yield* PubSub.publish(feed, undefined);
	});
