import { Context, Effect, Layer, PubSub } from "effect";

export interface StoredEvent {
	readonly kind: string;
	readonly payload: string;
	readonly seq: number;
	readonly sessionId: string;
}

// why: the log is the single truth. Feeds carry notifications beside writes,
// so missing one only loses latency: subscribers rehydrate and deduplicate.
export class DomainFeeds extends Context.Service<
	DomainFeeds,
	{
		readonly events: PubSub.PubSub<StoredEvent>;
		readonly fleet: PubSub.PubSub<void>;
		readonly voyages: PubSub.PubSub<void>;
	}
>()("@antumbra/domain-feeds/DomainFeeds") {}

export type DomainFeedsService = Context.Service.Shape<typeof DomainFeeds>;

export const DomainFeedsLive = Layer.effect(DomainFeeds)(
	Effect.gen(function* () {
		const events = yield* PubSub.unbounded<StoredEvent>();
		const fleet = yield* PubSub.unbounded<void>();
		const voyages = yield* PubSub.unbounded<void>();
		return { events, fleet, voyages };
	}),
);
