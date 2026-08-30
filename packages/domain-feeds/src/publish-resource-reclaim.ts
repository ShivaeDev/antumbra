import { Effect, PubSub } from "effect";

export const makePublishResourceReclaim = (feed: PubSub.PubSub<void>) =>
	Effect.fn("domainFeeds.publishResourceReclaim")(() => PubSub.publish(feed, undefined).pipe(Effect.asVoid));
