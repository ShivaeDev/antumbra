import { Clock, Effect, Ref } from "effect";

interface Tally {
	readonly appends: number;
	readonly failures: number;
	readonly millis: number;
}

const EMPTY: Tally = { appends: 0, failures: 0, millis: 0 };

const REPORT_STRIDE = 200;

const advanced = (current: Tally, settled: Tally): Tally => ({
	appends: current.appends + settled.appends,
	failures: current.failures + settled.failures,
	millis: current.millis + settled.millis,
});

// why: journaling a session tree writes once per node instead of once per
// session, and each batch owns one Database transaction. Counting appends in
// memory and reporting on a fixed stride keeps the observation far cheaper
// than the writes it observes, so throughput is a number in the log rather
// than a suspicion. The tally describes this process and resets with it;
// durable truth is the log itself.
export const makeJournalThroughput = Effect.gen(function* () {
	const tally = yield* Ref.make(EMPTY);
	const report = (due: Tally) =>
		Effect.logInfo("session event journal throughput", {
			appends: due.appends,
			failures: due.failures,
			meanMillis: Math.round(due.millis / due.appends),
		});
	const observe = (settled: Tally) =>
		Effect.gen(function* () {
			const due = yield* Ref.modify(tally, (current) => {
				const next = advanced(current, settled);
				return next.appends < REPORT_STRIDE ? [undefined, next] : [next, EMPTY];
			});
			if (due !== undefined) {
				yield* report(due);
			}
		});
	return {
		measure: (appends: number, write: Effect.Effect<boolean>) =>
			Effect.gen(function* () {
				const started = yield* Clock.currentTimeMillis;
				const recorded = yield* write;
				const millis = (yield* Clock.currentTimeMillis) - started;
				yield* observe({
					appends,
					failures: recorded ? 0 : appends,
					millis,
				});
				return recorded;
			}),
	};
});
