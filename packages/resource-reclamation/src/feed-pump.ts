import { Effect, PubSub, Queue, Stream } from "effect";

// why: the feed fans out while the reconciler needs at most one pending wake;
// a sliding queue prevents a busy pass from accumulating catch-up work.
export const pump = (
	feed: PubSub.PubSub<void>,
	tick: Queue.Queue<void>,
): Effect.Effect<void> =>
	Effect.gen(function* () {
		const subscription = yield* PubSub.subscribe(feed);
		yield* Stream.fromSubscription(subscription).pipe(
			Stream.runForEach(() => Queue.offer(tick, undefined)),
		);
	}).pipe(Effect.scoped);
