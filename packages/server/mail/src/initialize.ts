import { Effect, Semaphore } from "effect";

export const initialize = Effect.fn("Mail.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
