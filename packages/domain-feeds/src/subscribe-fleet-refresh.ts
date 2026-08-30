import { Effect, PubSub, type Scope } from "effect";

export const makeSubscribeFleetRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeFleetRefresh")(function* (): Effect.fn.Return<PubSub.Subscription<void>, never, Scope.Scope> {
		return yield* PubSub.subscribe(feed);
	});
