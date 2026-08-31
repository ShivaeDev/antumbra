import type { RulingFailure } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Stream } from "effect";

// why: subscribed before the first read, so a request or a verdict landing
// between the read and the subscription cannot leave a window holding an open
// set that has already moved on.
export const makeRulingRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const ticks = feeds.subscribeRulingRefresh().pipe(Effect.map(Stream.fromSubscription));
	return <A>(read: Effect.Effect<A, RulingFailure>): Stream.Stream<A, RulingFailure> =>
		Stream.unwrap(ticks.pipe(Effect.map((notices) => Stream.fromEffect(read).pipe(Stream.concat(notices.pipe(Stream.mapEffect(() => read)))))));
});
