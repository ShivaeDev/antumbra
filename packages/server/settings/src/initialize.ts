import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("Settings.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
