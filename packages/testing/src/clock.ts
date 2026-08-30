import { type Duration, Effect, Schedule } from "effect";
import { TestClock } from "effect/testing";

export type ClockMode = "live" | "test";

export interface HarnessClock {
	readonly adjust: (duration: Duration.Input) => Effect.Effect<void>;
}

export type Eventually = <A, E, R>(
	check: () => Effect.Effect<A, E, R>,
) => Effect.Effect<A, unknown, R>;

export const makeClock = (mode: ClockMode): HarnessClock => ({
	adjust: (duration) =>
		mode === "live" ? Effect.sleep(duration) : TestClock.adjust(duration),
});

const asFailure = <A, E, R>(check: () => Effect.Effect<A, E, R>) =>
	Effect.suspend(check).pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
	);

const liveRetry = <A, E, R>(attempt: Effect.Effect<A, E, R>) =>
	attempt.pipe(
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 3000 }))),
	);

const testRetry = <A, E, R>(attempt: Effect.Effect<A, E, R>) =>
	attempt.pipe(
		Effect.retry({
			times: 300,
			while: () => TestClock.adjust(10).pipe(Effect.as(true)),
		}),
	);

// why: TestClock does not advance on its own, so a wall-clock retry would
// hang; each miss steps the clock instead. Live tests have no TestClock and
// must wait on the schedule.
export const makeEventually = (mode: ClockMode): Eventually => {
	if (mode === "live") {
		return (check) => liveRetry(asFailure(check));
	}
	return (check) => testRetry(asFailure(check));
};
