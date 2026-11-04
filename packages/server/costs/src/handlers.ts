import { Effect, Layer } from "effect";
import { CostsContract } from "#contract.ts";
import { Costs } from "#service.ts";
export const handlers = CostsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Costs;
		return CostsContract.application.of({
			"costs.reading": (input) => service.reading(input).pipe(Effect.orDie),
			"costs.forVoyage": (input) => service.forVoyage(input).pipe(Effect.orDie),
			"costs.forAgent": (input) => service.forAgent(input).pipe(Effect.orDie),
		});
	}),
);
export const costs = handlers.pipe(Layer.provideMerge(Costs.layer));
