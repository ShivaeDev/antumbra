import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Changes.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
