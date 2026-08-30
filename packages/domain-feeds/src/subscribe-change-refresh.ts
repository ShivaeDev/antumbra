import { Effect, PubSub, type Scope } from "effect";

export const makeSubscribeChangeRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeChangeRefresh")(function* (): Effect.fn.Return<PubSub.Subscription<void>, never, Scope.Scope> {
		return yield* PubSub.subscribe(feed);
	});
