import { Effect, PubSub } from "effect";

export const makeSubscribeVoyageRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("DomainFeeds.subscribeVoyageRefresh")(() => PubSub.subscribe(feed));
