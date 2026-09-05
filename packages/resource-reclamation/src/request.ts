import { Effect, Queue } from "effect";

export const makeRequest = (tick: Queue.Queue<void>) =>
	Effect.fn("ResourceReconciler.request")(function* () {
		yield* Queue.offer(tick, undefined);
	});
