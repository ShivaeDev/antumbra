import type { SightFailure } from "@antumbra/contract";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Effect, PubSub, Stream } from "effect";

// why: what a voyage looks like is a function of its own rows and of who is
// at work — an agent going alive or retiring moves a piece between active and
// ready without any voyage row changing, so both feeds tick the same view.
// why: subscribed before the first read, so a write landing between the read
// and the subscription cannot leave a window holding a stale voyage forever.
export const makeVoyageRefreshes = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const ticks = Effect.gen(function* () {
		const voyageWrites = yield* PubSub.subscribe(feeds.voyages);
		const fleetWrites = yield* PubSub.subscribe(feeds.fleet);
		return Stream.merge(
			Stream.fromSubscription(voyageWrites),
			Stream.fromSubscription(fleetWrites),
		);
	});
	return <A>(
		read: Effect.Effect<A, SightFailure>,
	): Stream.Stream<A, SightFailure> =>
		Stream.unwrap(
			ticks.pipe(
				Effect.map((notices) =>
					Stream.fromEffect(read).pipe(
						Stream.concat(notices.pipe(Stream.mapEffect(() => read))),
					),
				),
			),
		);
});
