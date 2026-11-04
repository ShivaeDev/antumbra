import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Boards.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
