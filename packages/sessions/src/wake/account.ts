import { Effect } from "effect";

// Failure accounting stays on the Intent path because a boot-requeued wake has no send-scoped watcher.
export const accountedWake = <A, E, R>(sessionId: string, wake: Effect.Effect<A, E, R>) =>
	wake.pipe(Effect.tapCause((cause) => Effect.logWarning("a wake did not reach the session", { sessionId }, cause)));
