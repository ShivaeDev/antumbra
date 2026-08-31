import { Effect, PubSub } from "effect";

export const makePublishFleetRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishFleetRefresh")(() => PubSub.publish(feed, undefined).pipe(Effect.asVoid));
