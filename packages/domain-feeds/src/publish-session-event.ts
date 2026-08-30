import { Effect, PubSub } from "effect";
import type { StoredEvent } from "#stored-event.ts";

export const makePublishSessionEvent = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.fn("domainFeeds.publishSessionEvent")((event: StoredEvent) => PubSub.publish(feed, event).pipe(Effect.asVoid));
