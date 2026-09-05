import { IntentDemand, intentDemandLayer } from "@antumbra/intent-demand";
import { expect, it } from "@effect/vitest";
import { Context, Deferred, Effect, Layer, Ref } from "effect";

class Passes extends Context.Service<Passes, Ref.Ref<number>>()("test/Passes") {}

it.effect("binds a registration dependency for initial and requested passes", () =>
	Effect.gen(function* () {
		const passes = yield* Ref.make(0);
		const requested = yield* Deferred.make<void>();
		const pass = Effect.fnUntraced(function* () {
			const count = yield* Ref.updateAndGet(yield* Passes, (value) => value + 1);
			if (count === 2) yield* Deferred.succeed(requested, undefined);
		})();
		const layer = intentDemandLayer([{ pass, tag: "test/bound" }]).pipe(Layer.provide(Layer.succeed(Passes)(passes)));
		yield* Effect.gen(function* () {
			const demand = yield* IntentDemand;
			expect(yield* Ref.get(passes)).toBe(1);
			yield* demand.request();
			yield* Deferred.await(requested);
			expect(yield* Ref.get(passes)).toBe(2);
		}).pipe(Effect.provide(layer));
	}),
);
