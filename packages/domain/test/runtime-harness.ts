import { Database } from "@antumbra/persistence";
import { makeEffectApp, makeScriptedBackend } from "@antumbra/testing-runtime";
import { Effect, Layer } from "effect";
import { domainKernelServices } from "#test/domain-layers.ts";

export const it = {
	effectApp: makeEffectApp((temporary) =>
		Effect.gen(function* () {
			const scripted = yield* makeScriptedBackend;
			const harness = Effect.gen(function* () {
				return { db: yield* Database, scripted };
			});
			return { harness, layer: domainKernelServices(temporary, scripted.backend).pipe(Layer.orDie) };
		}),
	),
};
