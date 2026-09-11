import { served } from "@antumbra/glass-client/connect.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { app } from "@antumbra/server-journal/app.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { harness } from "@antumbra/server-journal/testing/harness.ts";
import { Effect, Layer } from "effect";

export const desk = <const Features extends readonly FeatureShape[]>(features: Features) =>
	Effect.gen(function* () {
		const definition = app(features);
		const services = yield* Layer.build(harness(definition));
		const api = yield* apiOf(definition).pipe(Effect.provide(services));
		const glass = served(features, Effect.succeed(api));
		yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
		return { api, glass };
	});
