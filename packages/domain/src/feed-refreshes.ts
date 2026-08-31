import { Effect, type PubSub, Queue, type Scope, Stream } from "effect";

export const runRefreshes = (
	subscribe: Effect.Effect<PubSub.Subscription<void>, never, Scope.Scope>,
	tick: Queue.Queue<void>,
): Effect.Effect<void, never, Scope.Scope> =>
	Effect.gen(function* () {
		const subscription = yield* subscribe;
		yield* Stream.fromSubscription(subscription).pipe(Stream.runForEach(() => Queue.offer(tick, undefined)));
	});
