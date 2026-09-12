import { Effect, Latch } from "effect";
import type { Reactivity } from "effect/unstable/reactivity/Reactivity";

export interface Watch {
	readonly around: <Value, Failure>(
		run: Effect.Effect<Value, Failure>,
	) => Effect.Effect<{ readonly value: Value; readonly generation: number }, Failure>;
	readonly delivered: (generation: number) => void;
	readonly cancel: () => void;
	readonly settled: Effect.Effect<void>;
}

export const watching = (reactivity: Reactivity["Service"], keys: readonly string[]): Watch => {
	const latch = Latch.makeUnsafe(false);
	const state = { completed: 0, generation: 1 };
	const cancel = reactivity.registerUnsafe(keys, () => {
		state.generation += 1;
		latch.closeUnsafe();
	});
	const finish = (started: number): void => {
		state.completed = Math.max(state.completed, started);
		if (state.completed >= state.generation) {
			latch.openUnsafe();
		}
	};
	return {
		around: (run) =>
			Effect.suspend(() => {
				const started = state.generation;
				return Effect.map(run, (value) => ({ value, generation: started }));
			}),
		cancel,
		delivered: finish,
		settled: latch.await,
	};
};
