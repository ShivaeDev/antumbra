import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { RulingDelivery } from "@antumbra/rulings/delivery/service";
import { Effect, Layer, Option, Stream } from "effect";
import { rungHolders } from "#ruling-ascent/rung.ts";

const guarded = <A, R>(act: Effect.Effect<A, unknown, R>, said: string) => act.pipe(Effect.catchCause((cause) => Effect.logError(said, cause)));

const onePass = Effect.fn("RulingAscent.onePass")(function* () {
	const rulings = yield* Rulings;
	const delivery = yield* RulingDelivery;
	const climbing = yield* rulings.awaitingAscent();
	if (climbing.length === 0) {
		return;
	}
	const holders = yield* rungHolders(climbing);
	yield* Effect.forEach(
		climbing,
		(ruling) =>
			Option.match(Option.fromUndefinedOr(holders.get(ruling.id)), {
				onNone: () => Effect.void,
				onSome: (toAgentId) => guarded(delivery.deliverAscent(ruling, toAgentId), "a ruling could not be carried to the rung it waits on"),
			}),
		{ discard: true },
	);
});

export const RulingAscent = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		// Subscribe before the initial pass so a concurrent ruling refresh is not missed.
		const notices = yield* feeds.subscribeRulingRefresh();
		const voyageWrites = yield* feeds.subscribeVoyageRefresh();
		const fleetWrites = yield* feeds.subscribeFleetRefresh();
		const world = Stream.merge(Stream.fromSubscription(voyageWrites), Stream.fromSubscription(fleetWrites));
		const pass = guarded(onePass(), "the ruling ascent pass failed");
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.merge(Stream.fromSubscription(notices), world).pipe(Stream.runForEach(() => pass)))));
	}),
);
