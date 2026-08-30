import { Effect, PubSub } from "effect";

export const makePublishVoyageRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishVoyageRefresh")(() => PubSub.publish(feed, undefined).pipe(Effect.asVoid));
