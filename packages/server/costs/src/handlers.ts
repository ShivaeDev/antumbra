import { CostsContract, ForAgent, ForVoyage, Reading } from "@antumbra/server-costs/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Costs } from "#service.ts";
export const handlers = CostsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Costs;
		return CostsContract.application.of({
			"costs.reading": (input) => stream(readKeys(Reading.reads(input)))(service.reading(input).pipe(Effect.orDie)),
			"costs.forVoyage": (input) => stream(readKeys(ForVoyage.reads(input)))(service.forVoyage(input).pipe(Effect.orDie)),
			"costs.forAgent": (input) => stream(readKeys(ForAgent.reads(input)))(service.forAgent(input).pipe(Effect.orDie)),
		});
	}),
);
export const costs = handlers.pipe(Layer.provideMerge(Costs.layer));
