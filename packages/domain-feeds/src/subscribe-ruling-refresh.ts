import { Effect, PubSub } from "effect";

export const makeSubscribeRulingRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("DomainFeeds.subscribeRulingRefresh")(() => PubSub.subscribe(feed));
