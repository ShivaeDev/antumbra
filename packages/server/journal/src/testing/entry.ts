import type { FeatureShape } from "@antumbra/platform-feature/feature.ts";
import { it } from "@effect/vitest";
import { Effect, type Scope } from "effect";
import { app } from "#app.ts";
import { apiOf } from "#testing/api.ts";
import { harness, type Services } from "#testing/harness.ts";
import { kit } from "#testing/kit.ts";
import type { TestApp } from "#testing/surface.ts";

export interface TestEntry<Features extends readonly FeatureShape[]> {
	readonly app: <Yielded extends Effect.Effect<unknown, unknown, Services<Features> | Scope.Scope>, Done>(
		name: string,
		body: (app: TestApp<Features>) => Generator<Yielded, Done, never>,
	) => void;
}

type Body = (app: TestApp<readonly FeatureShape[]>) => Generator<Effect.Effect<unknown, unknown>, unknown, never>;

export function testing<const Features extends readonly FeatureShape[]>(features: Features): TestEntry<Features>;
export function testing(features: readonly FeatureShape[]): unknown {
	const definition = app(features);
	const layer = harness(definition);
	const run = Effect.fnUntraced(function* (body: Body) {
		const parts = yield* kit(definition);
		const api = yield* apiOf(definition);
		return yield* Effect.fnUntraced(body)({ ...parts, api });
	});
	return { app: (name: string, body: Body) => it.effect(name, () => run(body).pipe(Effect.provide(layer), Effect.orDie)) };
}
