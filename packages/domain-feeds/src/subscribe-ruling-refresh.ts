import { Effect, PubSub, type Scope } from "effect";

export const makeSubscribeRulingRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeRulingRefresh")(function* (): Effect.fn.Return<PubSub.Subscription<void>, never, Scope.Scope> {
		return yield* PubSub.subscribe(feed);
	});
