import { DomainFeeds } from "@antumbra/domain-feeds";
import { Cause, Clock, Effect, Layer, Queue, Ref } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { nextObserveDelayMillis, type ObserveCadenceOptions, retryObserveDelayMillis } from "#change-cadence.ts";
import type { ChangeProcedures } from "#change-procedures.ts";
import { runRefreshes } from "#feed-refreshes.ts";

const DEFAULTS: ObserveCadenceOptions = {
	coldMillis: 900_000,
	hotMillis: 30_000,
	hotWindowMillis: 600_000,
	warmMillis: 180_000,
};

const announceFailure = (hostTag: string, cause: Cause.Cause<unknown>, run: number): Effect.Effect<void> =>
	run > 1 || Cause.hasInterruptsOnly(cause)
		? Effect.logDebug("a change watch pass failed again", { hostTag, run })
		: Effect.logWarning("a change watch pass failed", { hostTag }, cause);

const passAndWait = (changes: ChangeProcedures, hostTag: string, options: ObserveCadenceOptions, failures: Ref.Ref<number>): Effect.Effect<number> =>
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

const watchOneHost = (changes: ChangeProcedures, hostTag: string, options: ObserveCadenceOptions, tick: Queue.Queue<void>): Effect.Effect<never> =>
	Effect.gen(function* () {
		const failures = yield* Ref.make(0);
		// Refresh rings are latency hints; every wait remains bounded by the cadence.
		while (true) {
			const delayMillis = yield* passAndWait(changes, hostTag, options, failures);
			yield* Effect.timeoutOption(Queue.take(tick), delayMillis);
		}
	});

export const ChangeWatcherLive = (overrides: Partial<ObserveCadenceOptions> = {}) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const domain = yield* AgentDomain;
			const feeds = yield* DomainFeeds;
			// Hosts are fixed before layer construction, and each needs its own queue because a queue value has one taker.
			yield* Effect.forEach(domain.changes.hostTags, (hostTag) =>
				Effect.gen(function* () {
					const tick = yield* Queue.sliding<void>(1);
					yield* Effect.forkScoped(runRefreshes(feeds.subscribeChangeRefresh(), tick));
					yield* Effect.forkScoped(watchOneHost(domain.changes, hostTag, options, tick));
				}),
			);
		}),
	);
