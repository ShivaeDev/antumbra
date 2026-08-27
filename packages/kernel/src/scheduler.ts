import { Cause, Deferred, Effect, Exit, Option, Ref } from "effect";
import { SchedulerState } from "#state.ts";
import { applyTransition } from "#transitions.ts";
import { intentWaitCause } from "#wait-cause.ts";

const settleInterrupt = (id: string) =>
	applyTransition(id, "interrupt").pipe(
		Effect.catchTag("InvalidTransition", () => Effect.void),
	);

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
			yield* settleInterrupt(id);
			return;
		}
		const waiting = intentWaitCause(exit.cause);
		if (Option.isSome(waiting)) {
			if (waiting.value.interrupted) {
				yield* settleInterrupt(id);
				return;
			}
			yield* applyTransition(id, "wait", waiting.value.detail);
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
				Effect.onExit((exit) => settleExit(row.id, exit)),
			),
		);
		yield* Ref.update(state.running, (map) => new Map(map).set(row.id, fiber));
		yield* Deferred.succeed(registered, undefined);
	});
