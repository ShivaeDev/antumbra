import { defineService } from "@antumbra/service-definition";
import { type Context, Effect, PubSub, type Scope } from "effect";

export interface StoredEvent {
	readonly kind: string;
	readonly payload: string;
	readonly seq: number;
	readonly sessionId: string;
}

// why: the log is the single truth. Feeds carry notifications beside writes,
// so missing one only loses latency: subscribers rehydrate and deduplicate.
export const DomainFeeds = defineService({
	id: "@antumbra/domain-feeds/DomainFeeds",
	initialize: Effect.fn("domainFeeds.initialize")(
		function* (): Effect.fn.Return<{
			readonly changeRefresh: PubSub.PubSub<void>;
			readonly events: PubSub.PubSub<StoredEvent>;
			readonly fleet: PubSub.PubSub<void>;
			readonly resourceReclaim: PubSub.PubSub<void>;
			readonly voyages: PubSub.PubSub<void>;
		}> {
			return {
				changeRefresh: yield* PubSub.unbounded<void>(),
				events: yield* PubSub.unbounded<StoredEvent>(),
				fleet: yield* PubSub.unbounded<void>(),
				resourceReclaim: yield* PubSub.unbounded<void>(),
				voyages: yield* PubSub.unbounded<void>(),
			};
		},
	)(),
	methods: (feeds) => ({
		// why: a request to look at the hosts sooner than the cadence would, rung
		// by whoever just gave a host something new to say. It is a latency hint
		// and never a liveness dependency — a lost ring costs one patience period.
		publishChangeRefresh: Effect.fn("domainFeeds.publishChangeRefresh")(
			function* (): Effect.fn.Return<void> {
				yield* PubSub.publish(feeds.changeRefresh, undefined);
			},
		),
		subscribeChangeRefresh: Effect.fn("domainFeeds.subscribeChangeRefresh")(
			function* (): Effect.fn.Return<
				PubSub.Subscription<void>,
				never,
				Scope.Scope
			> {
				return yield* PubSub.subscribe(feeds.changeRefresh);
			},
		),
		publishSessionEvent: Effect.fn("domainFeeds.publishSessionEvent")(
			function* (event: StoredEvent): Effect.fn.Return<void> {
				yield* PubSub.publish(feeds.events, event);
			},
		),
		subscribeSessionEvents: Effect.fn("domainFeeds.subscribeSessionEvents")(
			function* (): Effect.fn.Return<
				PubSub.Subscription<StoredEvent>,
				never,
				Scope.Scope
			> {
				return yield* PubSub.subscribe(feeds.events);
			},
		),
		publishFleetRefresh: Effect.fn("domainFeeds.publishFleetRefresh")(
			function* (): Effect.fn.Return<void> {
				yield* PubSub.publish(feeds.fleet, undefined);
			},
		),
		subscribeFleetRefresh: Effect.fn("domainFeeds.subscribeFleetRefresh")(
			function* (): Effect.fn.Return<
				PubSub.Subscription<void>,
				never,
				Scope.Scope
			> {
				return yield* PubSub.subscribe(feeds.fleet);
			},
		),
		// why: durable truth can make held resources reclaimable without a
		// lifecycle transition. This ring only reduces latency; boot and cadence
		// still recover a missed notification.
		publishResourceReclaim: Effect.fn("domainFeeds.publishResourceReclaim")(
			function* (): Effect.fn.Return<void> {
				yield* PubSub.publish(feeds.resourceReclaim, undefined);
			},
		),
		subscribeResourceReclaim: Effect.fn("domainFeeds.subscribeResourceReclaim")(
			function* (): Effect.fn.Return<
				PubSub.Subscription<void>,
				never,
				Scope.Scope
			> {
				return yield* PubSub.subscribe(feeds.resourceReclaim);
			},
		),
		publishVoyageRefresh: Effect.fn("domainFeeds.publishVoyageRefresh")(
			function* (): Effect.fn.Return<void> {
				yield* PubSub.publish(feeds.voyages, undefined);
			},
		),
		subscribeVoyageRefresh: Effect.fn("domainFeeds.subscribeVoyageRefresh")(
			function* (): Effect.fn.Return<
				PubSub.Subscription<void>,
				never,
				Scope.Scope
			> {
				return yield* PubSub.subscribe(feeds.voyages);
			},
		),
	}),
	requires: [],
});

export type DomainFeedsService = Context.Service.Shape<typeof DomainFeeds>;

export const DomainFeedsLive = DomainFeeds.layer;
