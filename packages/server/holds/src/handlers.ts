import { Effect, Layer } from "effect";
import { HoldsContract } from "#contract.ts";
import { Holds } from "#service.ts";
export const handlers = HoldsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Holds;
		return HoldsContract.application.of({
			"holds.queues": (input) => service.queues(input).pipe(Effect.orDie),
		});
	}),
);
export const holds = handlers.pipe(Layer.provideMerge(Holds.layer));
