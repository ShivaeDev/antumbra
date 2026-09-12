import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { it as effectIt } from "@effect/vitest";
import { Effect, Layer, type Scope } from "effect";
import type { ReactNode } from "react";
import { definition, layer } from "#app.ts";
import { mount, settle } from "#glass/dom.ts";

export type Api = Glass<typeof definition.features>["api"];

interface GlassTest {
	readonly api: Api;
	readonly render: (screen: ReactNode) => Effect.Effect<HTMLElement>;
}

export const it = {
	glass: <Done,>(name: string, body: (test: GlassTest) => Generator<Effect.Effect<unknown, unknown, Scope.Scope>, Done, never>): void =>
		effectIt.live(name, () =>
			Effect.gen(function* () {
				const services = yield* Layer.build(layer);
				const api = yield* apiOf(definition).pipe(Effect.provide(services));
				const glass = served(definition.features, Effect.succeed(api));
				yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
				const { container, root } = yield* mount();
				const render = (screen: ReactNode) => settle(() => root.render(<glass.Provider>{screen}</glass.Provider>)).pipe(Effect.as(container));
				return yield* Effect.gen(() => body({ api: glass.api, render }));
			}),
		),
};
