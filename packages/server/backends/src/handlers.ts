import { BackendsContract, Catalog, Efforts, Models } from "@antumbra/server-backends/contract.ts";
import { readKeys } from "@shivaedev/changes/keys.ts";
import { Effect, Layer } from "effect";
import { stream } from "effect/reactivity/Reactivity";
import { Backends } from "#service.ts";
export const handlers = BackendsContract.application.toLayer(
	Effect.gen(function* () {
		const service = yield* Backends;
		return BackendsContract.application.of({
			"backends.observeCapability": (input) => service.observeCapability(input).pipe(Effect.orDie),
			"backends.listModels": (input) => service.listModels(input).pipe(Effect.orDie),
			"backends.models": (input) => stream(readKeys(Models.reads(input)))(service.models(input).pipe(Effect.orDie)),
			"backends.efforts": (input) => stream(readKeys(Efforts.reads(input)))(service.efforts(input).pipe(Effect.orDie)),
			"backends.catalog": (input) => stream(readKeys(Catalog.reads(input)))(service.catalog(input).pipe(Effect.orDie)),
		});
	}),
);
export const backends = handlers.pipe(Layer.provideMerge(Backends.layer));
