import { Effect, PubSub } from "effect";

export const makeSubscribeFleetRefresh = (feed: PubSub.PubSub<void>) => Effect.fn("DomainFeeds.subscribeFleetRefresh")(() => PubSub.subscribe(feed));
