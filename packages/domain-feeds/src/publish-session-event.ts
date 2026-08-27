import { Effect, PubSub } from "effect";
import type { StoredEvent } from "#stored-event.ts";

export const makePublishSessionEvent = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.fn("domainFeeds.publishSessionEvent")(function* (
		event: StoredEvent,
	): Effect.fn.Return<void> {
		yield* PubSub.publish(feed, event);
	});
