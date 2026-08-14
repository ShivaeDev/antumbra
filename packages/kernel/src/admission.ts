import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option, Queue, Ref } from "effect";
import type { AdmissionSnapshot, Gate } from "#gate.ts";
import { applyTransition, startIntent } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";

const takeSnapshot = Effect.gen(function* () {
	const state = yield* SchedulerState;
	const running = yield* Ref.get(state.running);
	const now = yield* Clock.currentTimeMillis;
	const lastChange = yield* Ref.get(state.lastChangeAt);
	return {
		millisSinceLastChange: now - lastChange,
		runningCount: running.size,
	} satisfies AdmissionSnapshot;
});

const scheduleRetry = (
	blocked: ReadonlyArray<Gate>,
	snapshot: AdmissionSnapshot,
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
		if (yield* Ref.getAndSet(state.retryPending, true)) {
			return;
		}
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

// why: the pull order is the scheduler's one policy seam — oldest-first in
// SQL today; priority class, focus, and demand land here without touching
// the loop.
const pullNext = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ status: "queued" })
		.orderBy([(intent) => intent.createdAt.asc(), (intent) => intent.id.asc()])
		.take(1)
		.first();
});

const admitOne = Effect.gen(function* () {
	const state = yield* SchedulerState;
	const snapshot = yield* takeSnapshot;
	const blocked = state.gates.filter((gate) => !gate.admits(snapshot));
	if (blocked.length > 0) {
		yield* scheduleRetry(blocked, snapshot);
		return "blocked" as const;
	}
	const next = yield* pullNext;
	if (Option.isNone(next)) {
		return "empty" as const;
	}
	const admitted = yield* applyTransition(next.value.id, "admit").pipe(
		Effect.map(Option.some),
		Effect.catchTags({
			IntentNotFound: () => Effect.succeed(Option.none()),
			InvalidTransition: () => Effect.succeed(Option.none()),
		}),
	);
	if (Option.isSome(admitted)) {
		yield* Effect.logDebug("admitted intent", { id: next.value.id });
		yield* startIntent(next.value);
	}
	return "pulled" as const;
});

const drain = Effect.repeat(admitOne, {
	while: (outcome) => outcome === "pulled",
});

export const schedulerLoop = Effect.gen(function* () {
	const state = yield* SchedulerState;
	// why: a failed drain must never kill the scheduler fiber — the kernel
	// would keep accepting intents and silently stop admitting them. Log the
	// cause and wait for the next tick. Pending ticks coalesce: they all mean
	// "look again", and one drain looks.
	yield* Effect.forever(
		Queue.take(state.tick).pipe(
			Effect.andThen(Queue.clear(state.tick)),
			Effect.andThen(drain),
			Effect.catchCause((cause) =>
				Effect.logError("scheduler drain failed", cause),
			),
		),
	);
});
