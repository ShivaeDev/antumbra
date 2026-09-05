import { DomainFeeds } from "@antumbra/domain-feeds";
import { RulingDelivery } from "@antumbra/rulings/delivery/service";
import { Effect, Layer, Stream } from "effect";

export const RulingDeliveryLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const delivery = yield* RulingDelivery;
		const notices = yield* feeds.subscribeRulingRefresh();
		const pass = delivery.deliverPending().pipe(Effect.catchCause((cause) => Effect.logError("the ruling delivery pass failed", cause)));
		yield* Effect.forkScoped(pass.pipe(Effect.andThen(Stream.fromSubscription(notices).pipe(Stream.runForEach(() => pass)))));
	}),
).pipe(Layer.provide(RulingDelivery.layer));
