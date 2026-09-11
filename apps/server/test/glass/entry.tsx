import "#test/glass/setup.ts";
import { type Glass, served } from "@antumbra/glass-client/connect.ts";
import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { app } from "@antumbra/server-journal/app.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { harness } from "@antumbra/server-journal/testing/harness.ts";
import { it } from "@effect/vitest";
import { Effect, Layer, type Scope } from "effect";
import type { ReactNode } from "react";
import { mount, settle } from "#test/glass/dom.ts";

interface GlassTest<Features extends readonly FeatureShape[]> {
	readonly api: Glass<Features>["api"];
	readonly render: (screen: ReactNode) => Effect.Effect<HTMLElement>;
}

export const testing = <const Features extends readonly FeatureShape[]>(features: Features) => ({
	glass: <Done,>(name: string, body: (test: GlassTest<Features>) => Generator<Effect.Effect<unknown, unknown, Scope.Scope>, Done, never>): void =>
		it.live(name, () =>
			Effect.gen(function* () {
				const definition = app(features);
				const services = yield* Layer.build(harness(definition));
				const api = yield* apiOf(definition).pipe(Effect.provide(services));
				const glass = served(features, Effect.succeed(api));
				yield* Effect.addFinalizer(() => Effect.sync(() => glass.registry.dispose()));
				const { container, root } = yield* mount();
				const render = (screen: ReactNode) => settle(() => root.render(<glass.Provider>{screen}</glass.Provider>)).pipe(Effect.as(container));
				return yield* Effect.gen(() => body({ api: glass.api, render }));
			}),
		),
});
