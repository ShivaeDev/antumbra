import type { FeatureShape } from "@antumbra/feature";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import type { AppDefinition } from "#app.ts";
import * as Journal from "#journal.ts";
import { kit } from "#testing/kit.ts";
import type { TestApp } from "#testing/surface.ts";

export { type AppDefinition, app } from "#app.ts";
export type { Emissions, TestApp } from "#testing/surface.ts";

export interface TestEntry<Features extends readonly FeatureShape[]> {
	readonly app: <Yielded extends Effect.Effect<unknown, unknown>, Done>(
		name: string,
		body: (app: TestApp<Features>) => Generator<Yielded, Done, never>,
	) => void;
}

type Body = (app: TestApp<readonly FeatureShape[]>) => Generator<Effect.Effect<unknown, unknown>, unknown, never>;

export function testing<Features extends readonly FeatureShape[]>(definition: AppDefinition<Features>): TestEntry<Features>;
export function testing(definition: AppDefinition): unknown {
	const layer = Layer.provideMerge(Journal.layer(definition), Journal.memory());
	const run = Effect.fnUntraced(function* (body: Body) {
		const app = yield* kit(definition);
		return yield* Effect.fnUntraced(body)(app);
	});
	return { app: (name: string, body: Body) => it.effect(name, () => run(body).pipe(Effect.provide(layer), Effect.orDie)) };
}
