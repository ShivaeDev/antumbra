import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Inputs.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
