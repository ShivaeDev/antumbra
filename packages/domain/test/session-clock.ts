import { Clock, Effect } from "effect";

const NANOS_PER_MILLI = 1_000_000n;

// why: the pass reads the clock once and judges every mark against that one
// moment, so running it with a clock further on is the same fact as the time
// having gone by. Simulating the configured wait instead would put many
// background passes in the way, each crossing the database, and no count of
// yields can promise they have all finished before the reading is taken.
export const aheadBy = (millis: number) =>
	Clock.clockWith((clock) =>
		Effect.succeed<Clock.Clock>({
			currentTimeMillis: Effect.map(clock.currentTimeMillis, (now) => now + millis),
			currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe() + millis,
			currentTimeNanos: Effect.map(clock.currentTimeNanos, (now) => now + BigInt(millis) * NANOS_PER_MILLI),
			currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe() + BigInt(millis) * NANOS_PER_MILLI,
			monotonicTimeNanos: clock.monotonicTimeNanos,
			monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
			sleep: (duration) => clock.sleep(duration),
		}),
	);
