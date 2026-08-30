import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { acquireTemporaryPersistence, type TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import {
	type HeldResourceRead,
	HeldResourceRead as HeldResourceReadService,
	ResourceReclaimRunnersLive,
	ResourceReconciler,
	ResourceReconcilerLive,
} from "#index.ts";

const layer = <E, R>(temporary: TemporaryPersistence, read: Effect.Effect<HeldResourceRead<E>, never, R>) =>
	ResourceReconcilerLive({ cadenceMillis: 60_000 }).pipe(
		Layer.provide(Layer.effect(HeldResourceReadService, read)),
		Layer.provide(ResourceReclaimRunnersLive(new Map())),
		Layer.provideMerge(DomainFeedsLive),
		Layer.provideMerge(temporary.layer),
	);

it.live("exposes mortal degradation and recovery without failing the layer", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const fail = yield* Ref.make(true);
		const read = Effect.succeed({
			held: () => Ref.get(fail).pipe(Effect.flatMap((shouldFail) => (shouldFail ? Effect.fail("uncertain held truth") : Effect.succeed(new Map())))),
		} satisfies HeldResourceRead<string>);
		yield* Effect.gen(function* () {
			const reconciler = yield* ResourceReconciler;
			expect(yield* reconciler.health).toMatchObject({ state: "degraded" });
			yield* Ref.set(fail, false);
			yield* reconciler.reconcile;
			expect(yield* reconciler.health).toMatchObject({ state: "healthy" });
		}).pipe(Effect.provide(layer(temporary, read)));
	}),
);
