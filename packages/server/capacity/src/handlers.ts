import { Effect, Layer } from "effect";
import { CapacityContract } from "#contract.ts";
import { unexpectedObserve, unexpectedRelease } from "#failures.ts";
import { Capacity } from "#service.ts";
export const handlers = CapacityContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Capacity;
		return CapacityContract.application.of({
			"capacity.observe": (input) => service.observe(input).pipe(Effect.catchIf(unexpectedObserve, Effect.die)),
			"capacity.release": (input) => service.release(input).pipe(Effect.catchIf(unexpectedRelease, Effect.die)),
			"capacity.providers": (input) => service.providers(input).pipe(Effect.orDie),
		});
	}),
);
export const capacity = handlers.pipe(Layer.provideMerge(Capacity.layer));
