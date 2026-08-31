import { Cause, Deferred, Effect, Exit, Option, Ref } from "effect";
import { SchedulerState } from "#state.ts";
import { applyTransition } from "#transitions.ts";
import { intentWaitCause } from "#wait-cause.ts";

const settleInterrupt = (id: string) => applyTransition(id, "interrupt").pipe(Effect.catchTag("InvalidTransition", () => Effect.void));

const settleExit = (id: string, exit: Exit.Exit<void, unknown>) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		// Free the slot before the status transition wakes admission.
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
			// Shutdown leaves running intents for the same boot reclaim used after a crash.
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
		// Settling is isolated, but its failure remains visible for boot reclaim.
		Effect.catchCause((cause) => Effect.logError("intent settle failed", { id }, cause)),
	);

export const startIntent = (row: { readonly id: string; readonly payload: string; readonly tag: string }) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		const kind = state.kinds.get(row.tag);
		if (kind === undefined) {
			yield* Effect.logWarning("no registered intent kind", { tag: row.tag });
			yield* applyTransition(row.id, "fail", `no registered intent kind for tag "${row.tag}"`);
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
