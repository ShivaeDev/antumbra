import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { Clock, Context, Effect, Layer, Queue, Ref, Semaphore } from "effect";
import { pump } from "#feed-pump.ts";
import type { HeldResourceRead } from "#held-resource-read.ts";
import { runResourceReclaimPass } from "#resource-reclaim-pass.ts";

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

const guardedPass = <E>(
	heldResourceRead: HeldResourceRead<E>,
	health: Ref.Ref<ResourceReclamationHealth>,
	runners: ReadonlyMap<string, Runner>,
) =>
	runResourceReclaimPass(heldResourceRead, runners).pipe(
		Effect.matchCauseEffect({
			onFailure: (cause) => {
				const failure = String(cause);
				return Clock.currentTimeMillis.pipe(
					Effect.flatMap((failedAtMillis) =>
						Ref.set(health, { failedAtMillis, failure, state: "degraded" }),
					),
					Effect.andThen(
						Effect.logWarning(
							"resource reclaim pass held uncertain durable truth",
							{ failure },
						),
					),
				);
			},
			onSuccess: () =>
				Clock.currentTimeMillis.pipe(
					Effect.flatMap((checkedAtMillis) =>
						Ref.set(health, { checkedAtMillis, state: "healthy" }),
					),
				),
		}),
	);

const cadenceLoop = (
	reconcile: Effect.Effect<void>,
	tick: Queue.Queue<void>,
	cadenceMillis: number,
): Effect.Effect<never> =>
	Effect.gen(function* () {
		while (true) {
			yield* Effect.timeoutOption(Queue.take(tick), cadenceMillis);
			yield* reconcile;
		}
	});

export const ResourceReconcilerLive = <E, R>(
	heldResourceRead: Effect.Effect<HeldResourceRead<E>, never, R>,
	runners: ReadonlyMap<string, Runner>,
	overrides: Partial<ResourceReconcileOptions> = {},
) =>
	Layer.effect(
		ResourceReconciler,
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const db = yield* Database;
			const heldRead = yield* heldResourceRead;
			const feeds = yield* DomainFeeds;
			const writer = yield* Writer;
			const executors = yield* Effect.context<WriteExecutors>();
			const context = Context.merge(
				executors,
				Context.make(Database, db).pipe(
					Context.add(DomainFeeds, feeds),
					Context.add(Writer, writer),
				),
			);
			const gate = yield* Semaphore.make(1);
			const health = yield* Ref.make<ResourceReclamationHealth>({
				state: "checking",
			});
			const tick = yield* Queue.sliding<void>(1);
			const reconcile = gate.withPermits(1)(
				guardedPass(heldRead, health, runners).pipe(
					Effect.provideContext(context),
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
			yield* Effect.forkScoped(pump(feeds.resourceReclaim, tick));
			yield* Effect.forkScoped(
				cadenceLoop(reconcile, tick, options.cadenceMillis),
			);
			return service;
		}),
	);
