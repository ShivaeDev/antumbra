import { makeEffectApp, makeScriptedBackend } from "@antumbra/testing-runtime";
import { Effect, Layer } from "effect";
import { domainKernelServices, sightSourceTestLayer } from "#test/domain-layers.ts";

export const it = {
	effectApp: makeEffectApp((temporary) =>
		Effect.gen(function* () {
			const scripted = yield* makeScriptedBackend;
			const harness = Effect.succeed({ scripted });
			const layer = sightSourceTestLayer.pipe(Layer.provideMerge(domainKernelServices(temporary, scripted.backend)), Layer.orDie);
			return { harness, layer };
		}),
	),
};
