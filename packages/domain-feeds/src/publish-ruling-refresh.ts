import { Effect, PubSub } from "effect";

export const makePublishRulingRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("DomainFeeds.publishRulingRefresh")(() => PubSub.publish(feed, undefined).pipe(Effect.asVoid));
