import { Effect, PubSub, type Scope } from "effect";

export const makeSubscribeResourceReclaim = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.subscribeResourceReclaim")(
		function* (): Effect.fn.Return<
			PubSub.Subscription<void>,
			never,
			Scope.Scope
		> {
			return yield* PubSub.subscribe(feed);
		},
	);
