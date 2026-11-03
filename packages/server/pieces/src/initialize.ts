import { Effect, Semaphore } from "effect";

export const initialize = Effect.fn("Pieces.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
