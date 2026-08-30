import { Effect, PubSub, type Scope } from "effect";
import type { StoredEvent } from "#stored-event.ts";

export const makeSubscribeSessionEvents = (feed: PubSub.PubSub<StoredEvent>) =>
	Effect.fn("domainFeeds.subscribeSessionEvents")(function* (): Effect.fn.Return<PubSub.Subscription<StoredEvent>, never, Scope.Scope> {
		return yield* PubSub.subscribe(feed);
	});
