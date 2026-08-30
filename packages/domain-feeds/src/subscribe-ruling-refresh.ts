import { Effect, PubSub } from "effect";

export const makeSubscribeRulingRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeRulingRefresh")(() => PubSub.subscribe(feed));
