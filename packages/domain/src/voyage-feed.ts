import type { SightFailure } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, Stream } from "effect";

export const makeVoyageRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	return <A>(read: Effect.Effect<A, SightFailure>): Stream.Stream<A, SightFailure> =>
		Stream.unwrap(
			Effect.gen(function* () {
				const voyageWrites = yield* feeds.subscribeVoyageRefresh();
				const fleetWrites = yield* feeds.subscribeFleetRefresh();
				const notices = Stream.merge(Stream.fromSubscription(voyageWrites), Stream.fromSubscription(fleetWrites));
				return Stream.fromEffect(read).pipe(Stream.concat(notices.pipe(Stream.mapEffect(() => read))));
			}),
		);
});
