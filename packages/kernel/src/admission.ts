import { Clock, Effect, Queue, Ref } from "effect";
import type { Gate } from "#gate.ts";
import {
	applyTransition,
	type SchedulerContext,
	startIntent,
} from "#scheduler.ts";

const scheduleRetry =
	(context: SchedulerContext) =>
	(blocked: ReadonlyArray<Gate>, snapshot: Parameters<Gate["admits"]>[0]) =>
		Effect.gen(function* () {
			const waits = blocked.flatMap((gate) =>
				gate.retryAfterMillis === undefined
					? []
					: [gate.retryAfterMillis(snapshot)],
			);
			if (waits.length === 0) {
				return;
			}
			if (yield* Ref.get(context.retryPending)) {
				return;
			}
			yield* Ref.set(context.retryPending, true);
			// why: a time-blocked gate reopens on its own schedule, not on a status
			// change, so a single pending timer re-ticks the loop when the longest
			// remaining wait has elapsed.
			yield* Effect.forkChild(
				Effect.sleep(Math.max(...waits)).pipe(
					Effect.andThen(Ref.set(context.retryPending, false)),
					Effect.andThen(Queue.offer(context.tick, undefined)),
				),
			);
		});

const oldestFirst = (
	a: { readonly createdAt: Date; readonly id: string },
	b: { readonly createdAt: Date; readonly id: string },
): number => {
	if (a.createdAt < b.createdAt) {
		return -1;
	}
	if (a.createdAt > b.createdAt) {
		return 1;
	}
	return a.id < b.id ? -1 : 1;
};

const drain = (context: SchedulerContext) =>
	Effect.gen(function* () {
		while (true) {
			const runningMap = yield* Ref.get(context.running);
			const now = yield* Clock.currentTimeMillis;
			const lastChange = yield* Ref.get(context.lastChangeAt);
			const snapshot = {
				millisSinceLastChange: now - lastChange,
				runningCount: runningMap.size,
			};
			const blocked = context.gates.filter((gate) => !gate.admits(snapshot));
			if (blocked.length > 0) {
				yield* scheduleRetry(context)(blocked, snapshot);
				return;
			}
			const queued = yield* context.db.Intent.where({ status: "queued" }).all();
			const [oldest] = [...queued].sort(oldestFirst);
			if (oldest === undefined) {
				return;
			}
			const admitted = yield* applyTransition(context)(oldest.id, "admit").pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.succeed(undefined),
					InvalidTransition: () => Effect.succeed(undefined),
				}),
			);
			if (admitted !== undefined) {
				yield* startIntent(context)(oldest);
			}
		}
	});

export const schedulerLoop = (context: SchedulerContext) =>
	Effect.forever(Queue.take(context.tick).pipe(Effect.andThen(drain(context))));
