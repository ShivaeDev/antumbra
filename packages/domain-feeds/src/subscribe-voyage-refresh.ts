import { Effect, PubSub } from "effect";

export const makeSubscribeVoyageRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeVoyageRefresh")(() => PubSub.subscribe(feed));
