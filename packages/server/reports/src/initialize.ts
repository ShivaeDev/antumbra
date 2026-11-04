import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Reports.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
