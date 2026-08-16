import { DomainFeeds } from "@antumbra/domain-feeds";
import { Clock, Effect, Layer, Queue } from "effect";
import {
	nextObserveDelayMillis,
	type ObserveCadenceOptions,
} from "#change-cadence.ts";
import type { ChangeProcedures } from "#change-procedures.ts";
import { AgentDomain } from "#domain.ts";
import { pump } from "#feed-pump.ts";

const DEFAULTS: ObserveCadenceOptions = {
	coldMillis: 900_000,
	hotMillis: 30_000,
	hotWindowMillis: 600_000,
	warmMillis: 180_000,
};

// why: one pass never decides anything about the next except how soon it comes.
// A pass that fails leaves every row exactly as it was — an unobserved change
// is an unchanged change — and the loop waits the middle cadence rather than
// hammering a host that is having a bad minute or falling silent for a quarter
// of an hour over one lost answer.
const passAndWait = (
	changes: ChangeProcedures,
	hostTag: string,
	options: ObserveCadenceOptions,
): Effect.Effect<number> =>
	Effect.gen(function* () {
		yield* changes.refresh(hostTag);
		const watchable = yield* changes.watchableChanges(hostTag);
		const now = yield* Clock.currentTimeMillis;
		return nextObserveDelayMillis(watchable, now, options);
	}).pipe(
		Effect.catchCause((cause) =>
			Effect.logWarning("a change watch pass failed", { hostTag }, cause).pipe(
				Effect.as(options.warmMillis),
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
		// why: every wait is bounded by a cadence, so a ring is a latency hint and
		// never a liveness dependency — a lost one self-heals within one period.
		while (true) {
			const delayMillis = yield* passAndWait(changes, hostTag, options);
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
