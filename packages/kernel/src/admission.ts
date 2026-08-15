import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option, Queue, Ref } from "effect";
import type { AdmissionSnapshot, Gate } from "#gate.ts";
import { applyTransition, startIntent } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";

type AdmitOutcome =
	| { readonly _tag: "blocked"; readonly retryMillis: Option.Option<number> }
	| { readonly _tag: "empty" }
	| { readonly _tag: "pulled" };

const takeSnapshot = Effect.gen(function* () {
	const state = yield* SchedulerState;
	const running = yield* Ref.get(state.running);
	const now = yield* Clock.currentTimeMillis;
	const lastChange = yield* Ref.get(state.lastChangeAt);
	const readings: Record<string, number> = {};
	for (const [name, gauge] of state.gauges) {
		readings[name] = yield* gauge;
	}
	return {
		millisSinceLastChange: now - lastChange,
		readings,
		runningCount: running.size,
	} satisfies AdmissionSnapshot;
});

const retryAfter = (
	blocked: ReadonlyArray<Gate>,
	snapshot: AdmissionSnapshot,
): Option.Option<number> => {
	const waits = blocked.flatMap((gate) =>
		gate.retryAfterMillis === undefined
			? []
			: [gate.retryAfterMillis(snapshot)],
	);
	// why: every blocked gate must reopen before anything is admitted, so the
	// earliest useful retry is the longest wait; gates without a schedule
	// reopen on status changes, which tick the loop on their own.
	return waits.length === 0 ? Option.none() : Option.some(Math.max(...waits));
};

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
		return {
			_tag: "blocked",
			retryMillis: retryAfter(blocked, snapshot),
		} satisfies AdmitOutcome;
	}
	const next = yield* pullNext;
	if (Option.isNone(next)) {
		return { _tag: "empty" } satisfies AdmitOutcome;
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
	return { _tag: "pulled" } satisfies AdmitOutcome;
});

const drain = Effect.repeat(admitOne, {
	while: (outcome) => outcome._tag === "pulled",
});

// why: a failed drain must never kill the scheduler fiber — the kernel would
// keep accepting intents and silently stop admitting them. Log the cause and
// wait for the next tick.
const guardedDrain = drain.pipe(
	Effect.catchCause((cause) =>
		Effect.logError("scheduler drain failed", cause).pipe(
			Effect.as({ _tag: "empty" } satisfies AdmitOutcome),
		),
	),
);

const patienceMillis = 5000;

export const schedulerLoop = Effect.gen(function* () {
	const state = yield* SchedulerState;
	// why: every wait is bounded — a gate deadline when one was published, the
	// patience floor otherwise. Ticks are latency hints, never a liveness
	// dependency; a lost wakeup self-heals within one patience period.
	const awaitTick = (retry: Option.Option<number>) =>
		Effect.timeoutOption(
			Queue.take(state.tick),
			Option.getOrElse(retry, () => patienceMillis),
		).pipe(Effect.asVoid);
	let retry = Option.none<number>();
	while (true) {
		yield* awaitTick(retry);
		const outcome = yield* guardedDrain;
		retry = outcome._tag === "blocked" ? outcome.retryMillis : Option.none();
	}
});
