import type { RulingFailure } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Stream } from "effect";

// Subscribe before the initial read so a concurrent refresh is not missed.
export const makeRulingRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const ticks = feeds.subscribeRulingRefresh().pipe(Effect.map(Stream.fromSubscription));
	return <A>(read: Effect.Effect<A, RulingFailure>): Stream.Stream<A, RulingFailure> =>
		Stream.unwrap(ticks.pipe(Effect.map((notices) => Stream.fromEffect(read).pipe(Stream.concat(notices.pipe(Stream.mapEffect(() => read)))))));
});
