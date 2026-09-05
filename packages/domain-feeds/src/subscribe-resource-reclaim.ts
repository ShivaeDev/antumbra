import { Effect, PubSub } from "effect";

export const makeSubscribeResourceReclaim = (feed: PubSub.PubSub<void>) =>
	Effect.fn("DomainFeeds.subscribeResourceReclaim")(() => PubSub.subscribe(feed));
