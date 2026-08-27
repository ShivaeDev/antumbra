import { Effect, PubSub } from "effect";
import type { StoredEvent } from "#stored-event.ts";

export interface DomainFeedState {
	readonly changeRefresh: PubSub.PubSub<void>;
	readonly events: PubSub.PubSub<StoredEvent>;
	readonly fleet: PubSub.PubSub<void>;
	readonly resourceReclaim: PubSub.PubSub<void>;
	readonly voyages: PubSub.PubSub<void>;
}

export const initializeDomainFeeds = Effect.fn("domainFeeds.initialize")(
	function* (): Effect.fn.Return<DomainFeedState> {
		return {
			changeRefresh: yield* PubSub.unbounded<void>(),
			events: yield* PubSub.unbounded<StoredEvent>(),
			fleet: yield* PubSub.unbounded<void>(),
			resourceReclaim: yield* PubSub.unbounded<void>(),
			voyages: yield* PubSub.unbounded<void>(),
		};
	},
)();
