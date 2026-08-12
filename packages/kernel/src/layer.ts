import { Database, Writer } from "@antumbra/persistence";
import {
	Clock,
	Effect,
	Fiber,
	Layer,
	Option,
	PubSub,
	Queue,
	Ref,
	Schema,
	Stream,
} from "effect";
import { schedulerLoop } from "#admission.ts";
import { IntentNotFound, UnregisteredIntentTag } from "#errors.ts";
import { IntentStatusSchema } from "#fsm.ts";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind, IntentKind } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { reclaim } from "#reclaim.ts";
import {
	announce,
	type IntentChange,
	type SchedulerContext,
	transitionRow,
} from "#scheduler.ts";

export interface KernelOptions {
	readonly gates?: ReadonlyArray<Gate>;
	readonly kinds: ReadonlyArray<AnyIntentKind>;
}

const changesFor = (context: SchedulerContext) => (id: string) =>
	Stream.unwrap(
		Effect.gen(function* () {
			// why: subscribing before the row read means a transition in the gap is
			// never lost — it lands in the subscription and the current status
			// already reflects it, so the dedup only ever drops repeats. Observers
			// see the latest state, not a complete journal.
			const subscription = yield* PubSub.subscribe(context.pubsub);
			const row = yield* context.db.Intent.where({ id }).first();
			if (Option.isNone(row)) {
				return yield* new IntentNotFound({ id });
			}
			const current = yield* Effect.orDie(
				Schema.decodeUnknownEffect(IntentStatusSchema)(row.value.status),
			);
			const live = Stream.fromSubscription(subscription).pipe(
				Stream.filter((change) => change.id === id),
				Stream.map((change) => change.status),
			);
			return Stream.make(current).pipe(Stream.concat(live), Stream.changes);
		}),
	).pipe(Stream.scoped);

const submitFor =
	(context: SchedulerContext) =>
	<Payload>(kind: IntentKind<Payload>, payload: Payload) =>
		Effect.gen(function* () {
			if (context.kinds.get(kind.tag) !== kind) {
				return yield* new UnregisteredIntentTag({ tag: kind.tag });
			}
			const encoded = yield* kind.encode(payload);
			const id = crypto.randomUUID();
			yield* context.write(
				context.db.Intent.create({
					detail: null,
					id,
					payload: encoded,
					resumePolicy: kind.reclaim,
					status: "queued",
					tag: kind.tag,
				}),
			);
			yield* announce(context)({ id, status: "queued" });
			return { changes: changesFor(context)(id), id };
		});

const cancelFor = (context: SchedulerContext) => (id: string) =>
	Effect.gen(function* () {
		const change = yield* context.write(
			transitionRow(context.db)(id, "cancel"),
		);
		yield* announce(context)(change);
		if (change.status === "cancelling") {
			const fiber = (yield* Ref.get(context.running)).get(id);
			if (fiber !== undefined) {
				yield* Fiber.interrupt(fiber);
			}
		}
	});

export const KernelLive = (options: KernelOptions) =>
	Layer.effect(Kernel)(
		Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const context: SchedulerContext = {
				db,
				gates: options.gates ?? [],
				kinds: new Map(options.kinds.map((kind) => [kind.tag, kind])),
				lastChangeAt: yield* Ref.make(yield* Clock.currentTimeMillis),
				pubsub: yield* PubSub.unbounded<IntentChange>(),
				retryPending: yield* Ref.make(false),
				running: yield* Ref.make<
					ReadonlyMap<string, Fiber.Fiber<void, unknown>>
				>(new Map()),
				tick: yield* Queue.unbounded<void>(),
				write: writer.write,
			};
			yield* reclaim(context);
			yield* Effect.forkScoped(schedulerLoop(context));
			yield* Queue.offer(context.tick, undefined);
			return {
				cancel: cancelFor(context),
				changes: changesFor(context),
				submit: submitFor(context),
			};
		}),
	);
