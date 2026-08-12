import type {
	DatabaseService,
	PrismaError,
	WriteExecutors,
} from "@antumbra/persistence";
import {
	Cause,
	Clock,
	Deferred,
	Effect,
	Exit,
	type Fiber,
	Option,
	PubSub,
	Queue,
	Ref,
	Schema,
} from "effect";
import { IntentNotFound } from "#errors.ts";
import {
	type IntentEvent,
	type IntentStatus,
	IntentStatusSchema,
	transition,
} from "#fsm.ts";
import type { Gate } from "#gate.ts";
import type { AnyIntentKind } from "#intent.ts";

export interface IntentChange {
	readonly id: string;
	readonly status: IntentStatus;
}

export interface SchedulerContext {
	readonly db: DatabaseService;
	readonly gates: ReadonlyArray<Gate>;
	readonly kinds: ReadonlyMap<string, AnyIntentKind>;
	readonly lastChangeAt: Ref.Ref<number>;
	readonly pubsub: PubSub.PubSub<IntentChange>;
	readonly retryPending: Ref.Ref<boolean>;
	readonly running: Ref.Ref<ReadonlyMap<string, Fiber.Fiber<void, unknown>>>;
	readonly tick: Queue.Queue<void>;
	readonly write: <A, E, R>(
		program: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | PrismaError, R | WriteExecutors>;
}

// why: every status write is a read-transition-update against the FSM table
// inside the single write lane, so concurrent transitions serialize and an
// illegal move can never reach the row.
export const transitionRow =
	(db: DatabaseService) => (id: string, event: IntentEvent, detail?: string) =>
		Effect.gen(function* () {
			const row = yield* db.Intent.where({ id }).first();
			if (Option.isNone(row)) {
				return yield* new IntentNotFound({ id });
			}
			const current = yield* Effect.orDie(
				Schema.decodeUnknownEffect(IntentStatusSchema)(row.value.status),
			);
			const status = yield* Effect.fromResult(transition(current, event));
			const now = yield* Clock.currentTimeMillis;
			yield* db.Intent.where({ id }).update({
				detail: detail ?? null,
				status,
				updatedAt: new Date(now),
			});
			return { id, status };
		});

export const announce = (context: SchedulerContext) => (change: IntentChange) =>
	Effect.gen(function* () {
		yield* Ref.set(context.lastChangeAt, yield* Clock.currentTimeMillis);
		yield* PubSub.publish(context.pubsub, change);
		yield* Queue.offer(context.tick, undefined);
	});

export const applyTransition =
	(context: SchedulerContext) =>
	(id: string, event: IntentEvent, detail?: string) =>
		context
			.write(transitionRow(context.db)(id, event, detail))
			.pipe(Effect.tap(announce(context)));

const settleExit =
	(context: SchedulerContext) => (id: string, exit: Exit.Exit<void, unknown>) =>
		Effect.gen(function* () {
			yield* Ref.update(context.running, (map) => {
				const next = new Map(map);
				next.delete(id);
				return next;
			});
			if (Exit.isSuccess(exit)) {
				yield* applyTransition(context)(id, "succeed");
				return;
			}
			if (Cause.hasInterruptsOnly(exit.cause)) {
				// why: an interrupt either finishes a cancel (row is "cancelling") or is
				// a shutdown, where "interrupt" is illegal from "running" — the FSM
				// rejection leaves the row for boot reclaim, making in-process teardown
				// indistinguishable from a crash on disk.
				yield* applyTransition(context)(id, "interrupt").pipe(
					Effect.catchTag("InvalidTransition", () => Effect.void),
				);
				return;
			}
			yield* applyTransition(context)(id, "fail", Cause.pretty(exit.cause));
		}).pipe(Effect.uninterruptible, Effect.ignore);

export const startIntent =
	(context: SchedulerContext) =>
	(row: {
		readonly id: string;
		readonly payload: string;
		readonly tag: string;
	}) =>
		Effect.gen(function* () {
			const kind = context.kinds.get(row.tag);
			if (kind === undefined) {
				yield* applyTransition(context)(
					row.id,
					"fail",
					`no registered intent kind for tag "${row.tag}"`,
				);
				return;
			}
			const registered = yield* Deferred.make<void>();
			const fiber = yield* Effect.forkChild(
				Deferred.await(registered).pipe(
					Effect.andThen(kind.run(row.payload)),
					Effect.onExit((exit) => settleExit(context)(row.id, exit)),
				),
			);
			yield* Ref.update(context.running, (map) =>
				new Map(map).set(row.id, fiber),
			);
			yield* Deferred.succeed(registered, undefined);
		});
