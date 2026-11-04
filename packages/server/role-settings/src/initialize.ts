import { Effect, Semaphore } from "effect";
export const initialize = Effect.fn("RoleSettings.initialize")(function* () {
	return yield* Semaphore.make(1);
})();
