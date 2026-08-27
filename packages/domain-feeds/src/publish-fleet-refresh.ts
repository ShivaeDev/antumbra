import { Effect, PubSub } from "effect";

export const makePublishFleetRefresh = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishFleetRefresh")(
		function* (): Effect.fn.Return<void> {
			yield* PubSub.publish(feed, undefined);
		},
	);
