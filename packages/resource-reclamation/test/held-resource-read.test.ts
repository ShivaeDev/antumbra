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

it.live("runs again after held-resource reading fails", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const attempts = yield* Ref.make(0);
		const read = Effect.succeed({
			held: () =>
				Ref.getAndUpdate(attempts, (attempt) => attempt + 1).pipe(
					Effect.flatMap((attempt) => (attempt === 0 ? Effect.fail("uncertain held truth") : Effect.succeed(new Map()))),
				),
		} satisfies HeldResourceRead<string>);
		yield* Effect.gen(function* () {
			const reconciler = yield* ResourceReconciler;
			yield* reconciler.reconcile;
			expect(yield* Ref.get(attempts)).toBe(2);
		}).pipe(Effect.provide(layer(temporary, read)));
	}),
);
