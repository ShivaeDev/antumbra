import { Effect, PubSub } from "effect";

export const makeSubscribeFleetRefresh = (feed: PubSub.PubSub<void>) => Effect.fn("domainFeeds.subscribeFleetRefresh")(() => PubSub.subscribe(feed));
