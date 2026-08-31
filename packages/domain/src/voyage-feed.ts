import type { SightFailure } from "@antumbra/contract";
import { DomainFeeds, type DomainFeedsService } from "@antumbra/domain-feeds";
import { Effect, Stream } from "effect";

export const voyageWorldTicks = (feeds: DomainFeedsService) =>
	Effect.gen(function* () {
		const voyageWrites = yield* feeds.subscribeVoyageRefresh();
		const fleetWrites = yield* feeds.subscribeFleetRefresh();
		return Stream.merge(Stream.fromSubscription(voyageWrites), Stream.fromSubscription(fleetWrites));
	});

export const makeVoyageRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const ticks = voyageWorldTicks(feeds);
	return <A>(read: Effect.Effect<A, SightFailure>): Stream.Stream<A, SightFailure> =>
		Stream.unwrap(ticks.pipe(Effect.map((notices) => Stream.fromEffect(read).pipe(Stream.concat(notices.pipe(Stream.mapEffect(() => read)))))));
});
