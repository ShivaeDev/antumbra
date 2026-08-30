import { Effect, PubSub } from "effect";

export const makePublishChangeRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishChangeRefresh")(() => PubSub.publish(feed, undefined).pipe(Effect.asVoid));
