import { Database, Writer } from "@antumbra/persistence";
import {
	Cause,
	Clock,
	Deferred,
	Effect,
	Exit,
	Option,
	PubSub,
	Queue,
	Ref,
	Schema,
} from "effect";
import { WorkflowEngine } from "effect/unstable/workflow";
import { IntentNotFound } from "#errors.ts";
import { type IntentEvent, IntentStatusSchema, transition } from "#fsm.ts";
import { type IntentChange, SchedulerState } from "#state.ts";

// why: every status write is a read-transition-update against the FSM table
// inside the single write lane, so concurrent transitions serialize and an
// illegal move can never reach the row.
export const transitionRow = (
	id: string,
	event: IntentEvent,
	detail?: string,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
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

export const announce = (change: IntentChange) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		yield* Ref.set(state.lastChangeAt, yield* Clock.currentTimeMillis);
		yield* PubSub.publish(state.pubsub, change);
		yield* Queue.offer(state.tick, undefined);
	});

export const applyTransition = (
	id: string,
	event: IntentEvent,
	detail?: string,
) =>
	Effect.gen(function* () {
		const writer = yield* Writer;
		const change = yield* writer.write(transitionRow(id, event, detail));
		yield* announce(change);
		return change;
	});

const settleExit = (id: string, exit: Exit.Exit<void, unknown>) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		// why: the fiber leaves the running map before the status write announces
		// its tick, so the drain woken by this completion sees the freed slot at
		// once. Handoff latency is all that rides on this order — the drain's
		// bounded patience covers liveness.
		yield* Ref.update(state.running, (map) => {
			const next = new Map(map);
			next.delete(id);
			return next;
		});
		if (Exit.isSuccess(exit)) {
			yield* applyTransition(id, "succeed");
			return;
		}
		if (Cause.hasInterruptsOnly(exit.cause)) {
			// why: an interrupt either finishes a cancel (row is "cancelling") or is
			// a shutdown, where "interrupt" is illegal from "running" — the FSM
			// rejection leaves the row for boot reclaim, making in-process teardown
			// indistinguishable from a crash on disk.
			yield* applyTransition(id, "interrupt").pipe(
				Effect.catchTag("InvalidTransition", () => Effect.void),
			);
			return;
		}
		yield* applyTransition(id, "fail", Cause.pretty(exit.cause));
	}).pipe(
		Effect.uninterruptible,
		// why: settling must never take anything else down, but a swallowed
		// write failure strands the row as "running" with no fiber until boot
		// reclaim — the cause is logged before being discarded.
		Effect.catchCause((cause) =>
			Effect.logError("intent settle failed", { id }, cause),
		),
	);

export const startIntent = (row: {
	readonly id: string;
	readonly payload: string;
	readonly tag: string;
}) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		const kind = state.kinds.get(row.tag);
		if (kind === undefined) {
			yield* Effect.logWarning("no registered intent kind", { tag: row.tag });
			yield* applyTransition(
				row.id,
				"fail",
				`no registered intent kind for tag "${row.tag}"`,
			);
			return;
		}
		const registered = yield* Deferred.make<void>();
		const fiber = yield* Effect.forkChild(
			Deferred.await(registered).pipe(
				Effect.andThen(kind.run(row.id, row.payload)),
				Effect.provideService(
					WorkflowEngine.WorkflowEngine,
					state.workflowEngine,
				),
				Effect.onExit((exit) => settleExit(row.id, exit)),
			),
		);
		yield* Ref.update(state.running, (map) => new Map(map).set(row.id, fiber));
		yield* Deferred.succeed(registered, undefined);
	});
