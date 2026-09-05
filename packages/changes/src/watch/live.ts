import { DomainFeeds } from "@antumbra/domain-feeds";
import { Cause, Clock, Effect, Layer, Queue, Ref, Stream } from "effect";
import { Changes } from "#change-submissions/service.ts";
import { nextObserveDelayMillis, type ObserveCadenceOptions, retryObserveDelayMillis } from "#watch/cadence.ts";

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

const passAndWait = Effect.fn("ChangeWatcher.passAndWait")(
	function* (hostTag: string, options: ObserveCadenceOptions, failures: Ref.Ref<number>) {
		const changes = yield* Changes;
		yield* changes.refresh(hostTag);
		const watchable = yield* changes.watchable(hostTag);
		const now = yield* Clock.currentTimeMillis;
		yield* Ref.set(failures, 0);
		return nextObserveDelayMillis(watchable, now, options);
	},
	(effect, hostTag, options, failures) =>
		effect.pipe(
			Effect.catchCause((cause) =>
				Ref.updateAndGet(failures, (run) => run + 1).pipe(
					Effect.tap((run) => announceFailure(hostTag, cause, run)),
					Effect.map((run) => retryObserveDelayMillis(run, options)),
				),
			),
		),
);

const watchOneHost = Effect.fn("ChangeWatcher.watchOneHost")(function* (hostTag: string, options: ObserveCadenceOptions, tick: Queue.Queue<void>) {
	const failures = yield* Ref.make(0);
	// Refresh rings are latency hints; every wait remains bounded by the cadence.
	while (true) {
		const delayMillis = yield* passAndWait(hostTag, options, failures);
		yield* Effect.timeoutOption(Queue.take(tick), delayMillis);
	}
});

export const ChangeWatcherLive = (hostTags: ReadonlyArray<string>, overrides: Partial<ObserveCadenceOptions> = {}) =>
	Layer.effectDiscard(
		Effect.gen(function* () {
			const options = { ...DEFAULTS, ...overrides };
			const feeds = yield* DomainFeeds;
			// Hosts are fixed before layer construction, and each needs its own queue because a queue value has one taker.
			yield* Effect.forEach(hostTags, (hostTag) =>
				Effect.gen(function* () {
					const tick = yield* Queue.sliding<void>(1);
					const refreshes = feeds.subscribeChangeRefresh().pipe(Effect.map(Stream.fromSubscription));
					yield* Effect.forkScoped(Stream.unwrap(refreshes).pipe(Stream.runForEach(() => Queue.offer(tick, undefined))));
					yield* Effect.forkScoped(watchOneHost(hostTag, options, tick));
				}),
			);
		}),
	);
