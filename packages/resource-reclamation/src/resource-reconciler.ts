import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Clock, Context, Effect, Layer, Queue, Ref, Semaphore, Stream } from "effect";
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
		readonly health: Effect.Effect<ResourceReclamationHealth>;
		readonly reconcile: Effect.Effect<void>;
		readonly request: Effect.Effect<void>;
	}
>()("@antumbra/resource-reclamation/ResourceReconciler") {}

export type ResourceReclamationHealth =
	| { readonly state: "checking" }
	| { readonly checkedAtMillis: number; readonly state: "healthy" }
	| {
			readonly failedAtMillis: number;
			readonly failure: string;
			readonly state: "degraded";
	  };

const markDegraded = (health: Ref.Ref<ResourceReclamationHealth>, cause: unknown) =>
	Effect.gen(function* () {
		const failedAtMillis = yield* Clock.currentTimeMillis;
		const failure = String(cause);
		yield* Ref.set(health, { failedAtMillis, failure, state: "degraded" });
		yield* Effect.logWarning("resource reclaim pass held uncertain durable truth", { failure });
	});

const markHealthy = (health: Ref.Ref<ResourceReclamationHealth>) =>
	Clock.currentTimeMillis.pipe(Effect.flatMap((checkedAtMillis) => Ref.set(health, { checkedAtMillis, state: "healthy" })));

const guardedPass = (health: Ref.Ref<ResourceReclamationHealth>) =>
	runResourceReclaimPass.pipe(
		Effect.matchCauseEffect({
			onFailure: (cause) => markDegraded(health, cause),
			onSuccess: () => markHealthy(health),
		}),
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
			const gate = yield* Semaphore.make(1);
			const health = yield* Ref.make<ResourceReclamationHealth>({
				state: "checking",
			});
			const tick = yield* Queue.sliding<void>(1);
			const reconcile = gate.withPermits(1)(
				guardedPass(health).pipe(
					Effect.provideService(Database, db),
					Effect.provideService(DomainFeeds, feeds),
					Effect.provideService(HeldResourceRead, heldResourceRead),
					Effect.provideService(ResourceReclaimRunners, runners),
				),
			);
			const service = ResourceReconciler.of({
				health: Ref.get(health),
				reconcile,
				request: Queue.offer(tick, undefined).pipe(Effect.asVoid),
			});
			// why: boot waits for the first pass, so kernel admission never starts
			// against a durable claim that only a later background fiber would see.
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
