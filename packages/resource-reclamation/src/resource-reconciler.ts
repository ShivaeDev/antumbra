import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Context, Effect, Layer, Queue, Stream } from "effect";
import { HeldResourceRead } from "#held-resource-read.ts";
import { runResourceReclaimPass } from "#resource-reclaim-pass.ts";
import { ResourceReclaimRunners } from "#resource-reclaim-runners.ts";

export interface ResourceReconcileOptions {
	readonly cadenceMillis: number;
}

const DEFAULTS: ResourceReconcileOptions = {
	cadenceMillis: 300_000,
};

export class ResourceReconciler extends Context.Service<
	ResourceReconciler,
	{
		readonly reconcile: Effect.Effect<void>;
		readonly request: Effect.Effect<void>;
	}
>()("@antumbra/resource-reclamation/ResourceReconciler") {}

const guardedPass = runResourceReclaimPass.pipe(
	Effect.catchCause((cause) => Effect.logWarning("resource reclaim pass held uncertain durable truth", { failure: String(cause) })),
);

const cadenceLoop = (reconcile: Effect.Effect<void>, tick: Queue.Queue<void>, cadenceMillis: number): Effect.Effect<never> =>
	Effect.gen(function* () {
		while (true) {
			yield* Effect.timeoutOption(Queue.take(tick), cadenceMillis);
			yield* reconcile;
		}
	});

export const ResourceReconcilerLive = (overrides: Partial<ResourceReconcileOptions> = {}) =>
	Layer.effect(
		ResourceReconciler,
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const db = yield* Database;
			const feeds = yield* DomainFeeds;
			const heldResourceRead = yield* HeldResourceRead;
			const runners = yield* ResourceReclaimRunners;
			const tick = yield* Queue.sliding<void>(1);
			const reconcile = guardedPass.pipe(
				Effect.provideService(Database, db),
				Effect.provideService(DomainFeeds, feeds),
				Effect.provideService(HeldResourceRead, heldResourceRead),
				Effect.provideService(ResourceReclaimRunners, runners),
			);
			const service = ResourceReconciler.of({
				reconcile,
				request: Queue.offer(tick, undefined).pipe(Effect.asVoid),
			});
			yield* reconcile;
			yield* Effect.forkScoped(
				Effect.gen(function* () {
					const subscription = yield* feeds.subscribeResourceReclaim();
					yield* Stream.fromSubscription(subscription).pipe(Stream.runForEach(() => Queue.offer(tick, undefined)));
				}),
			);
			yield* Effect.forkScoped(cadenceLoop(reconcile, tick, options.cadenceMillis));
			return service;
		}),
	);
