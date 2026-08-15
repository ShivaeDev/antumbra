import {
	Context,
	type Effect,
	type Fiber,
	type PubSub,
	type Queue,
	type Ref,
} from "effect";
import type { IntentStatus } from "#fsm.ts";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind } from "#intent.ts";

export interface IntentChange {
	readonly id: string;
	readonly status: IntentStatus;
}

// why: the scheduler's runtime state is one package-private service, provided
// only inside KernelLive and never exported from the package entry — the
// registry, gates, pubsub, and fiber bookkeeping stay invisible to consumers.
export class SchedulerState extends Context.Service<
	SchedulerState,
	{
		readonly gates: ReadonlyArray<Gate>;
		readonly gauges: ReadonlyMap<string, Effect.Effect<number>>;
		readonly kinds: ReadonlyMap<string, AnyIntentKind>;
		readonly lastChangeAt: Ref.Ref<number>;
		readonly nextId: Effect.Effect<string>;
		readonly pubsub: PubSub.PubSub<IntentChange>;
		readonly running: Ref.Ref<ReadonlyMap<string, Fiber.Fiber<void, unknown>>>;
		readonly tick: Queue.Queue<void>;
	}
>()("@antumbra/kernel/SchedulerState") {}
