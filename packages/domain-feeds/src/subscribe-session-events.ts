import { Effect, PubSub } from "effect";
import type { StoredEvent } from "#stored-event.ts";

export const makeSubscribeSessionEvents = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.fn("DomainFeeds.subscribeSessionEvents")(() => PubSub.subscribe(feed));
