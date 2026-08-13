import { Database } from "@antumbra/persistence";
import { Clock, Effect, Queue, Ref } from "effect";
import type { Gate } from "#gate.ts";
import { applyTransition, startIntent } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";

const scheduleRetry = (
	blocked: ReadonlyArray<Gate>,
	snapshot: Parameters<Gate["admits"]>[0],
) =>
	Effect.gen(function* () {
		const state = yield* SchedulerState;
		const waits = blocked.flatMap((gate) =>
			gate.retryAfterMillis === undefined
				? []
				: [gate.retryAfterMillis(snapshot)],
		);
		if (waits.length === 0) {
			return;
		}
		if (yield* Ref.get(state.retryPending)) {
			return;
		}
		yield* Ref.set(state.retryPending, true);
		// why: a time-blocked gate reopens on its own schedule, not on a status
		// change, so a single pending timer re-ticks the loop when the longest
		// remaining wait has elapsed.
		yield* Effect.forkChild(
			Effect.sleep(Math.max(...waits)).pipe(
				Effect.andThen(Ref.set(state.retryPending, false)),
				Effect.andThen(Queue.offer(state.tick, undefined)),
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

const drain = Effect.gen(function* () {
	const state = yield* SchedulerState;
	const db = yield* Database;
	while (true) {
		const runningMap = yield* Ref.get(state.running);
		const now = yield* Clock.currentTimeMillis;
		const lastChange = yield* Ref.get(state.lastChangeAt);
		const snapshot = {
			millisSinceLastChange: now - lastChange,
			runningCount: runningMap.size,
		};
		const blocked = state.gates.filter((gate) => !gate.admits(snapshot));
		if (blocked.length > 0) {
			yield* scheduleRetry(blocked, snapshot);
			return;
		}
		const queued = yield* db.Intent.where({ status: "queued" }).all();
		const [oldest] = [...queued].sort(oldestFirst);
		if (oldest === undefined) {
			return;
		}
		const admitted = yield* applyTransition(oldest.id, "admit").pipe(
			Effect.catchTags({
				IntentNotFound: () => Effect.succeed(undefined),
				InvalidTransition: () => Effect.succeed(undefined),
			}),
		);
		if (admitted !== undefined) {
			yield* startIntent(oldest);
		}
	}
});

export const schedulerLoop = Effect.gen(function* () {
	const state = yield* SchedulerState;
	yield* Effect.forever(Queue.take(state.tick).pipe(Effect.andThen(drain)));
});
