import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { kit } from "@antumbra/server-journal/testing/kit.ts";
import type { TestApp } from "@antumbra/server-journal/testing/surface.ts";
import { it as test } from "@effect/vitest";
import { Effect, type Layer, type Scope } from "effect";
import { definition, layer } from "#app.ts";

export type App = TestApp<typeof definition.features>;

type Services = Layer.Success<typeof layer>;

export const it = {
	app: <Done>(name: string, body: (app: App) => Generator<Effect.Effect<unknown, unknown, Services | Scope.Scope>, Done, never>): void =>
		test.effect(name, () =>
			Effect.gen(function* () {
				const parts = yield* kit(definition);
				const api = yield* apiOf(definition);
				return yield* Effect.gen(() => body({ ...parts, api }));
			}).pipe(Effect.provide(layer), Effect.orDie),
		),
};

export { answered, eventually } from "#answers.ts";

export { definition } from "#app.ts";
