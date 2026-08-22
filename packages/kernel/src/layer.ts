import { Database, Writer } from "@antumbra/persistence";
import {
	Clock,
	Context,
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
import { activeIntents } from "#active-intents.ts";
import { schedulerLoop } from "#admission.ts";
import { IntentNotFound, UnregisteredIntentTag } from "#errors.ts";
import { IntentStatusSchema } from "#fsm.ts";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind, IntentKind } from "#intent.ts";
import { type IntentChange, type IntentSubmission, Kernel } from "#kernel.ts";
import { reclaim } from "#reclaim.ts";
import { announce, transitionRow } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";

export interface KernelOptions {
	readonly gates?: ReadonlyArray<Gate>;
	readonly gauges?: Readonly<Record<string, Effect.Effect<number, unknown>>>;
	readonly kinds: ReadonlyArray<AnyIntentKind>;
	readonly nextId?: Effect.Effect<string>;
}

const changesFor = (id: string) =>
	Stream.unwrap(
		Effect.gen(function* () {
			const db = yield* Database;
			const { pubsub } = yield* SchedulerState;
			// why: subscribing before the row read means a transition in the gap is
			// never lost — it lands in the subscription and the current status
			// already reflects it, so the dedup only ever drops repeats. Observers
			// see the latest state, not a complete journal.
			const subscription = yield* PubSub.subscribe(pubsub);
			const row = yield* db.Intent.where({ id }).first();
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

const submitIntent = <Payload>(
	kind: IntentKind<Payload>,
	payload: Payload,
	changes: (id: string) => IntentSubmission["changes"],
) =>
	Effect.gen(function* () {
		const { kinds, nextId } = yield* SchedulerState;
		if (kinds.get(kind.tag) !== kind) {
			return yield* new UnregisteredIntentTag({ tag: kind.tag });
		}
		const encoded = yield* kind.encode(payload);
		const id = yield* nextId;
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Intent.create({
				detail: null,
				id,
				payload: encoded,
				status: "queued",
				tag: kind.tag,
			}),
		);
		yield* announce({ id, status: "queued" });
		return { changes: changes(id), id };
	});

const cancelIntent = (id: string) =>
	Effect.gen(function* () {
		const writer = yield* Writer;
		const change = yield* writer.write(transitionRow(id, "cancel"));
		yield* announce(change);
		if (change.status === "cancelling") {
			const { running } = yield* SchedulerState;
			const fiber = (yield* Ref.get(running)).get(id);
			if (fiber !== undefined) {
				yield* Fiber.interrupt(fiber);
			}
		}
	});

const retryIntent = (id: string) =>
	Effect.gen(function* () {
		const writer = yield* Writer;
		const change = yield* writer.write(transitionRow(id, "retry"));
		yield* announce(change);
	});

export const KernelLive = (options: KernelOptions) =>
	Layer.effect(Kernel)(
		Effect.gen(function* () {
			const state = {
				gates: options.gates ?? [],
				gauges: new Map(Object.entries(options.gauges ?? {})),
				kinds: new Map(options.kinds.map((kind) => [kind.tag, kind])),
				lastChangeAt: yield* Ref.make(yield* Clock.currentTimeMillis),
				// why: ids are an injectable effect so a seeded simulation can own
				// them; the ambient uuid is the default, not a hard-wired impurity.
				nextId: options.nextId ?? Effect.sync(() => crypto.randomUUID()),
				pubsub: yield* PubSub.unbounded<IntentChange>(),
				running: yield* Ref.make<
					ReadonlyMap<string, Fiber.Fiber<void, unknown>>
				>(new Map()),
				// why: a sliding capacity-1 queue makes tick coalescing structural —
				// any number of "look again" signals collapse into at most one
				// pending element, so the drain never runs a redundant pass.
				tick: yield* Queue.sliding<void>(1),
			};
			const context = Context.make(SchedulerState, state).pipe(
				Context.add(Database, yield* Database),
				Context.add(Writer, yield* Writer),
			);
			const changes = (id: string) =>
				changesFor(id).pipe(Stream.provideContext(context));
			yield* reclaim.pipe(Effect.provideContext(context));
			yield* Effect.forkScoped(
				schedulerLoop.pipe(Effect.provideContext(context)),
			);
			yield* Queue.offer(state.tick, undefined);
			return {
				active: <Payload>(kind: IntentKind<Payload>) =>
					activeIntents(kind).pipe(Effect.provideContext(context)),
				cancel: (id) => cancelIntent(id).pipe(Effect.provideContext(context)),
				changes,
				retry: (id) => retryIntent(id).pipe(Effect.provideContext(context)),
				submit: <Payload>(kind: IntentKind<Payload>, payload: Payload) =>
					submitIntent(kind, payload, changes).pipe(
						Effect.provideContext(context),
					),
				transitions: Stream.fromPubSub(state.pubsub),
			};
		}),
	);
