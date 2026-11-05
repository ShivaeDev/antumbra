import { CapacityContract, Providers } from "@antumbra/server-capacity/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { unexpectedObserve, unexpectedRelease } from "#failures.ts";
import { Capacity } from "#service.ts";
export const handlers = CapacityContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Capacity;
		return CapacityContract.application.of({
			"capacity.observe": (input) => service.observe(input).pipe(Effect.catchIf(unexpectedObserve, Effect.die)),
			"capacity.release": (input) => service.release(input).pipe(Effect.catchIf(unexpectedRelease, Effect.die)),
			"capacity.providers": (input) => stream(readKeys(Providers.reads(input)))(service.providers(input).pipe(Effect.orDie)),
		});
	}),
);
export const capacity = handlers.pipe(Layer.provideMerge(Capacity.layer));
