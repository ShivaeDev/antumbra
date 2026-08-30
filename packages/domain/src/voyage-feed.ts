import type { SightFailure } from "@antumbra/contract";
import { DomainFeeds, type DomainFeedsService } from "@antumbra/domain-feeds";
import { Effect, Stream } from "effect";

// why: what a voyage looks like is a function of its own rows and of who is
// at work — an agent going alive or retiring moves a piece between active and
// ready without any voyage row changing, so both feeds tick the same world.
// Every reader of that world waits on this pair rather than picking one.
export const voyageWorldTicks = (feeds: DomainFeedsService) =>
	Effect.gen(function* () {
		const voyageWrites = yield* feeds.subscribeVoyageRefresh();
		const fleetWrites = yield* feeds.subscribeFleetRefresh();
		return Stream.merge(Stream.fromSubscription(voyageWrites), Stream.fromSubscription(fleetWrites));
	});

// why: subscribed before the first read, so a write landing between the read
// and the subscription cannot leave a window holding a stale voyage forever.
export const makeVoyageRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const ticks = voyageWorldTicks(feeds);
	return <A>(read: Effect.Effect<A, SightFailure>): Stream.Stream<A, SightFailure> =>
		Stream.unwrap(ticks.pipe(Effect.map((notices) => Stream.fromEffect(read).pipe(Stream.concat(notices.pipe(Stream.mapEffect(() => read)))))));
});
