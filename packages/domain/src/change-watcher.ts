import { DomainFeeds, pump } from "@antumbra/domain-feeds";
import { Cause, Clock, Effect, Layer, Queue, Ref } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import {
	nextObserveDelayMillis,
	type ObserveCadenceOptions,
	retryObserveDelayMillis,
} from "#change-cadence.ts";
import type { ChangeProcedures } from "#change-procedures.ts";

const DEFAULTS: ObserveCadenceOptions = {
	coldMillis: 900_000,
	hotMillis: 30_000,
	hotWindowMillis: 600_000,
	warmMillis: 180_000,
};

// why: the pass that opens a run of failures is worth a warning; the ones
// after it repeat a sentence nobody needs twice, and a host out for an hour
// would otherwise fill the log with it. Interruption is not failure at all —
// it is this loop being told the app is closing.
const announceFailure = (
	hostTag: string,
	cause: Cause.Cause<unknown>,
	run: number,
): Effect.Effect<void> =>
	run > 1 || Cause.hasInterruptsOnly(cause)
		? Effect.logDebug("a change watch pass failed again", { hostTag, run })
		: Effect.logWarning("a change watch pass failed", { hostTag }, cause);

// why: one pass never decides anything about the next except how soon it comes.
// A pass that fails leaves every row exactly as it was — an unobserved change
// is an unchanged change — and the run of failures behind it, rather than the
// fleet it could not read, says how long to wait before asking again.
const passAndWait = (
	changes: ChangeProcedures,
	hostTag: string,
	options: ObserveCadenceOptions,
	failures: Ref.Ref<number>,
): Effect.Effect<number> =>
	Effect.gen(function* () {
		yield* changes.refresh(hostTag);
		const watchable = yield* changes.watchableChanges(hostTag);
		const now = yield* Clock.currentTimeMillis;
		yield* Ref.set(failures, 0);
		return nextObserveDelayMillis(watchable, now, options);
	}).pipe(
		Effect.catchCause((cause) =>
			Ref.updateAndGet(failures, (run) => run + 1).pipe(
				Effect.tap((run) => announceFailure(hostTag, cause, run)),
				Effect.map((run) => retryObserveDelayMillis(run, options)),
			),
		),
	);

const watchOneHost = (
	changes: ChangeProcedures,
	hostTag: string,
	options: ObserveCadenceOptions,
	tick: Queue.Queue<void>,
): Effect.Effect<never> =>
	Effect.gen(function* () {
		const failures = yield* Ref.make(0);
		// why: every wait is bounded by a cadence, so a ring is a latency hint and
		// never a liveness dependency — a lost one self-heals within one period.
		while (true) {
			const delayMillis = yield* passAndWait(
				changes,
				hostTag,
				options,
				failures,
			);
			yield* Effect.timeoutOption(Queue.take(tick), delayMillis);
		}
	});

export const ChangeWatcherLive = (
	overrides: Partial<ObserveCadenceOptions> = {},
) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			// why: hosts register before the domain layer builds, so the set is
			// complete here and a plain iteration at layer start is the whole of it.
			// A host arriving later would need a registry that can be subscribed to,
			// which nothing in this build produces.
			//
			// why: one queue per host rather than one shared — a ring must wake
			// every host's loop, and a queue hands each value to one taker only.
			yield* Effect.forEach(domain.changes.hostTags, (hostTag) =>
				Effect.gen(function* () {
					const tick = yield* Queue.sliding<void>(1);
					yield* Effect.forkScoped(pump(feeds.changeRefresh, tick));
					yield* Effect.forkScoped(
						watchOneHost(domain.changes, hostTag, options, tick),
					);
				}),
			);
		}),
	);
