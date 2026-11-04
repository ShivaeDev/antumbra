import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Repos.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
