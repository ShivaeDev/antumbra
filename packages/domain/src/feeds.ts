import { Effect, PubSub } from "effect";

export interface StoredEvent {
	readonly kind: string;
	readonly payload: string;
	readonly seq: number;
	readonly sessionId: string;
}

// why: the log is the single truth — feeds carry notifications beside the
// write, so a subscriber that misses one only loses latency, never events:
// it rehydrates from the log and dedups by seq.
export interface DomainFeeds {
	readonly events: PubSub.PubSub<StoredEvent>;
	readonly fleet: PubSub.PubSub<void>;
	readonly voyages: PubSub.PubSub<void>;
}

export const makeDomainFeeds: Effect.Effect<DomainFeeds> = Effect.gen(
	function* () {
		const events = yield* PubSub.unbounded<StoredEvent>();
		const fleet = yield* PubSub.unbounded<void>();
		const voyages = yield* PubSub.unbounded<void>();
		return { events, fleet, voyages };
	},
);
