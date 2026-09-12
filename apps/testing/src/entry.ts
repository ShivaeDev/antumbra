import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { kit } from "@antumbra/server-journal/testing/kit.ts";
import type { TestApp } from "@antumbra/server-journal/testing/surface.ts";
import { it as test } from "@effect/vitest";
import { Effect, Layer, type Scope } from "effect";
import { definition, layer } from "#app.ts";
import { ScriptedArtifacts } from "#artifacts.ts";

export type App = TestApp<typeof definition.features> & { readonly artifacts: ScriptedArtifacts["Service"] };

type Services = Layer.Success<typeof layer>;

export const it = {
	app: <Done>(name: string, body: (app: App) => Generator<Effect.Effect<unknown, unknown, Services | Scope.Scope>, Done, never>): void =>
		test.effect(name, () =>
			Effect.gen(function* () {
				const services = yield* Layer.build(layer);
				return yield* Effect.gen(function* () {
					const parts = yield* kit(definition);
					const api = yield* apiOf(definition);
					const artifacts = yield* ScriptedArtifacts;
					return yield* Effect.gen(() => body({ ...parts, api, artifacts }));
				}).pipe(Effect.provide(services));
			}).pipe(Effect.orDie),
		),
};

export { answered, eventually } from "#answers.ts";

export { definition } from "#app.ts";
