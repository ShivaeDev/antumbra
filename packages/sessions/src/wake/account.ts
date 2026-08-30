import { Effect } from "effect";

// why: every way a wake can end without reaching its Session is accounted for
// on the Intent's own path. It used to be accounted for by a watcher the
// admiral's send forked, so a wake requeued by boot reclaim — the one with
// nobody standing over it — ran, parked, and left no word anywhere. The cause
// travels with the sentence because the reason a wake parked is the whole of
// what a reader came for.
export const accountedWake = <A, E, R>(
	sessionId: string,
	wake: Effect.Effect<A, E, R>,
) =>
	wake.pipe(
		Effect.tapCause((cause) =>
			Effect.logWarning(
				"a wake did not reach the session",
				{ sessionId },
				cause,
			),
		),
	);
