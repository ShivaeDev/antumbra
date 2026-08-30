import { Context, type Effect, type Fiber, type PubSub, type Queue, type Ref } from "effect";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind } from "#intent.ts";
import type { IntentChange } from "#kernel.ts";

export class SchedulerState extends Context.Service<
	SchedulerState,
	{
		readonly gates: ReadonlyArray<Gate>;
		readonly gauges: ReadonlyMap<string, Effect.Effect<number, unknown>>;
		readonly kinds: ReadonlyMap<string, AnyIntentKind>;
		readonly lastChangeAt: Ref.Ref<number>;
		readonly nextId: Effect.Effect<string>;
		readonly pubsub: PubSub.PubSub<IntentChange>;
		readonly running: Ref.Ref<ReadonlyMap<string, Fiber.Fiber<void, unknown>>>;
		readonly tick: Queue.Queue<void>;
	}
>()("@antumbra/kernel/SchedulerState") {}
