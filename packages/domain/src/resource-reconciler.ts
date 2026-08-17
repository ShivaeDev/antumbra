import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { Runner } from "@antumbra/plugin-api";
import { Context, Effect, Layer, Queue, Semaphore } from "effect";
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
		readonly reconcile: Effect.Effect<void>;
		readonly request: Effect.Effect<void>;
	}
>()("@antumbra/domain/ResourceReconciler") {}

const guardedPass = (runners: ReadonlyMap<string, Runner>) =>
	runResourceReclaimPass(runners).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning("resource reclaim pass held uncertain durable truth", {
				failure: String(cause),
			}),
		),
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

export const ResourceReconcilerLive = (
	runners: ReadonlyMap<string, Runner>,
	overrides: Partial<ResourceReconcileOptions> = {},
) =>
	Layer.effect(
		ResourceReconciler,
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const db = yield* Database;
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
			const tick = yield* Queue.sliding<void>(1);
			const reconcile = gate.withPermits(1)(
				guardedPass(runners).pipe(Effect.provideContext(context)),
			);
			const service = ResourceReconciler.of({
				reconcile,
				request: Queue.offer(tick, undefined).pipe(Effect.asVoid),
			});
			// why: boot waits for the first pass, so kernel admission never starts
			// against a durable claim that only a later background fiber would see.
			yield* reconcile;
			yield* Effect.forkScoped(
				cadenceLoop(reconcile, tick, options.cadenceMillis),
			);
			return service;
		}),
	);
