import { Effect, PubSub } from "effect";

export const makeSubscribeChangeRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("DomainFeeds.subscribeChangeRefresh")(() => PubSub.subscribe(feed));
