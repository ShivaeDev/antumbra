import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option, Queue, Ref } from "effect";
import type { AdmissionSnapshot, Gate } from "#gate.ts";
import { startIntent } from "#scheduler.ts";
import { SchedulerState } from "#state.ts";
import { applyTransition } from "#transitions.ts";

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

const retryAfter = (blocked: ReadonlyArray<Gate>, snapshot: AdmissionSnapshot): Option.Option<number> => {
	const waits = blocked.flatMap((gate) => (gate.retryAfterMillis === undefined ? [] : [gate.retryAfterMillis(snapshot)]));
	// Admission can resume only after the slowest scheduled gate reopens.
	return waits.length === 0 ? Option.none() : Option.some(Math.max(...waits));
};

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

// A failed drain is logged and retried on the next scheduler tick.
const guardedDrain = drain.pipe(
	Effect.catchCause((cause) => Effect.logError("scheduler drain failed", cause).pipe(Effect.as({ _tag: "empty" } satisfies AdmitOutcome))),
);

const patienceMillis = 5000;

export const schedulerLoop = Effect.gen(function* () {
	const state = yield* SchedulerState;
	// The deadline makes ticks a latency hint rather than a liveness dependency.
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
