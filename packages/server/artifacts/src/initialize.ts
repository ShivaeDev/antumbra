import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Artifacts.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
