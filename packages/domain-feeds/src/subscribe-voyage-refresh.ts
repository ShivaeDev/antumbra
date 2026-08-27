import { Effect, PubSub, type Scope } from "effect";

export const makeSubscribeVoyageRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeVoyageRefresh")(
		function* (): Effect.fn.Return<
			PubSub.Subscription<void>,
			never,
			Scope.Scope
		> {
			return yield* PubSub.subscribe(feed);
		},
	);
