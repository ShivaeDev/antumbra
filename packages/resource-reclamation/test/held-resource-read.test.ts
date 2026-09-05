import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect, Layer, Ref } from "effect";
import {
	type HeldResourceRead,
	HeldResourceRead as HeldResourceReadService,
	ResourceReclaimRunnersLive,
	ResourceReconciler,
	ResourceReconcilerLive,
} from "#index.ts";

const layer = <E>(read: Effect.Effect<HeldResourceRead<E>>) =>
	ResourceReconcilerLive({ cadenceMillis: 60_000 }).pipe(
		Layer.provide(Layer.effect(HeldResourceReadService, read)),
		Layer.provide(ResourceReclaimRunnersLive(new Map())),
		Layer.provide(DomainFeedsLive),
	);

it.effectDB("runs again after held-resource reading fails", function* () {
	const attempts = yield* Ref.make(0);
	const read = Effect.succeed({
		held: () =>
			Ref.getAndUpdate(attempts, (attempt) => attempt + 1).pipe(
				Effect.flatMap((attempt) => (attempt === 0 ? Effect.fail("uncertain held truth") : Effect.succeed(new Map()))),
			),
	} satisfies HeldResourceRead<string>);
	yield* Effect.gen(function* () {
		const reconciler = yield* ResourceReconciler;
		yield* reconciler.reconcile();
		expect(yield* Ref.get(attempts)).toBe(2);
	}).pipe(Effect.provide(layer(read)));
});
