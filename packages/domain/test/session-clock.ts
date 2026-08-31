import { Clock, Effect } from "effect";

const NANOS_PER_MILLI = 1_000_000n;

// The pass reads Clock once; advancing its focused Clock avoids driving unrelated background passes.
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
