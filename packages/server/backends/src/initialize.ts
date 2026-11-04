import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Backends.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
