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
		// why: a request to look at the hosts sooner than the cadence would, rung
		// by whoever just gave a host something new to say. It is a latency hint
		// and never a liveness dependency — a lost ring costs one patience period.
		readonly changeRefresh: PubSub.PubSub<void>;
		readonly events: PubSub.PubSub<StoredEvent>;
		readonly fleet: PubSub.PubSub<void>;
		// why: durable truth can make held resources reclaimable without a
		// lifecycle transition. This ring only reduces latency; boot and cadence
		// still recover a missed notification.
		readonly resourceReclaim: PubSub.PubSub<void>;
		readonly voyages: PubSub.PubSub<void>;
	}
>()("@antumbra/domain-feeds/DomainFeeds") {}

export type DomainFeedsService = Context.Service.Shape<typeof DomainFeeds>;

export const DomainFeedsLive = Layer.effect(DomainFeeds)(
	Effect.gen(function* () {
		const changeRefresh = yield* PubSub.unbounded<void>();
		const events = yield* PubSub.unbounded<StoredEvent>();
		const fleet = yield* PubSub.unbounded<void>();
		const resourceReclaim = yield* PubSub.unbounded<void>();
		const voyages = yield* PubSub.unbounded<void>();
		return { changeRefresh, events, fleet, resourceReclaim, voyages };
	}),
);
