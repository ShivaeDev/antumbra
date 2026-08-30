import { Effect, PubSub } from "effect";

export const makeSubscribeResourceReclaim = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeResourceReclaim")(() => PubSub.subscribe(feed));
