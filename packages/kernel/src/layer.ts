import { Database } from "@antumbra/persistence";
import { Clock, Context, Effect, type Fiber, Layer, PubSub, Queue, Ref, Stream } from "effect";
import { activeIntents } from "#active-intents.ts";
import { schedulerLoop } from "#admission.ts";
import { cancelIntent } from "#cancel.ts";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind, IntentKind } from "#intent.ts";
import { changesFor } from "#intent-changes.ts";
import { type IntentChange, Kernel } from "#kernel.ts";
import { reclaim } from "#reclaim.ts";
import { retryIntent } from "#retry.ts";
import { retryIntentIfWaiting } from "#retry-if-waiting.ts";
import { SchedulerState } from "#state.ts";
import { submitIntent } from "#submit.ts";

export interface KernelOptions {
	readonly gates?: ReadonlyArray<Gate>;
	readonly gauges?: Readonly<Record<string, Effect.Effect<number, unknown>>>;
	readonly kinds: ReadonlyArray<AnyIntentKind>;
	readonly nextId?: Effect.Effect<string>;
}

export const KernelLive = (options: KernelOptions) =>
	Layer.effect(Kernel)(
		Effect.gen(function* () {
			const state = {
				gates: options.gates ?? [],
				gauges: new Map(Object.entries(options.gauges ?? {})),
				kinds: new Map(options.kinds.map((kind) => [kind.tag, kind])),
				lastChangeAt: yield* Ref.make(yield* Clock.currentTimeMillis),
				nextId: options.nextId ?? Effect.sync(() => crypto.randomUUID()),
				pubsub: yield* PubSub.unbounded<IntentChange>(),
				running: yield* Ref.make<ReadonlyMap<string, Fiber.Fiber<void, unknown>>>(new Map()),
				tick: yield* Queue.sliding<void>(1),
			};
			const context = Context.make(SchedulerState, state).pipe(Context.add(Database, yield* Database));
			const changes = (id: string) => changesFor(id).pipe(Stream.provideContext(context));
			yield* reclaim.pipe(Effect.provideContext(context));
			yield* Effect.forkScoped(schedulerLoop.pipe(Effect.provideContext(context)));
			yield* Queue.offer(state.tick, undefined);
			return {
				active: <Payload>(kind: IntentKind<Payload>) => activeIntents(kind).pipe(Effect.provideContext(context)),
				cancel: (id) => cancelIntent(id).pipe(Effect.provideContext(context)),
				changes,
				retry: (id) => retryIntent(id).pipe(Effect.provideContext(context)),
				retryIfWaiting: (id, expectedDetail) => retryIntentIfWaiting(id, expectedDetail).pipe(Effect.provideContext(context)),
				submit: <Payload>(kind: IntentKind<Payload>, payload: Payload) => submitIntent(kind, payload).pipe(Effect.provideContext(context)),
				transitions: Stream.fromPubSub(state.pubsub),
			};
		}),
	);
