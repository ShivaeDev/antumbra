import { Effect, PubSub } from "effect";

export const makeSubscribeChangeRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeChangeRefresh")(() => PubSub.subscribe(feed));
