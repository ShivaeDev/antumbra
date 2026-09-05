import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Queue, Stream } from "effect";
import { reconcile } from "#reconcile.ts";
import { ResourceReconcilerOptions } from "#resource-reconciler-options.ts";

const observeRequests = Effect.fnUntraced(function* (tick: Queue.Queue<void>) {
	const feeds = yield* DomainFeeds;
	const subscription = yield* feeds.subscribeResourceReclaim();
	yield* Stream.fromSubscription(subscription).pipe(Stream.runForEach(() => Queue.offer(tick, undefined)));
});

const cadenceLoop = Effect.fnUntraced(function* (tick: Queue.Queue<void>, cadenceMillis: number) {
	while (true) {
		yield* Effect.timeoutOption(Queue.take(tick), cadenceMillis);
		yield* reconcile();
	}
});

export const initializeResourceReconciler = Effect.fn("ResourceReconciler.initialize")(function* () {
	const options = yield* ResourceReconcilerOptions;
	const tick = yield* Queue.sliding<void>(1);
	yield* reconcile();
	yield* Effect.forkScoped(observeRequests(tick));
	yield* Effect.forkScoped(cadenceLoop(tick, options.cadenceMillis));
	return tick;
})();
