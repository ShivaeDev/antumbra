import { BackendsContract } from "@antumbra/server-backends/contract.ts";
import { Effect, Layer } from "effect";
import { Backends } from "#service.ts";
export const handlers = BackendsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Backends;
		return BackendsContract.application.of({
			"backends.observeCapability": (input) => service.observeCapability(input).pipe(Effect.orDie),
			"backends.listModels": (input) => service.listModels(input).pipe(Effect.orDie),
			"backends.models": (input) => service.models(input).pipe(Effect.orDie),
			"backends.efforts": (input) => service.efforts(input).pipe(Effect.orDie),
			"backends.catalog": (input) => service.catalog(input).pipe(Effect.orDie),
		});
	}),
);
export const backends = handlers.pipe(Layer.provideMerge(Backends.layer));
