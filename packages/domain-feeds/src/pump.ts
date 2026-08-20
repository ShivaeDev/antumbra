import { Effect, PubSub, Queue, Stream } from "effect";

// why: a feed fans out to every subscriber while a loop wants at most one
// pending wake, so the two are joined by a sliding queue of one — any number
// of rings collapse into a single next pass, and a loop that is already
// working never queues up a backlog of catching up to do.
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
