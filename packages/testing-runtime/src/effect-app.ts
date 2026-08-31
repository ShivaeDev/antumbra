import type { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { type Context, Effect, Layer } from "effect";
import { TestClock, TestConsole } from "effect/testing";
import { workerIt } from "#adapters/worker.ts";

const testEnvironment = Layer.mergeAll(TestClock.layer(), TestConsole.layer);

interface EffectAppOptions {
	readonly clock: "live";
}

type DatabaseRequirement = Context.Service.Identifier<typeof Database>;

type EffectAppBody<Harness, A, E, Services> = (harness: Harness) => Effect.fn.Return<A, E, Services | DatabaseRequirement>;

interface EffectApp<Harness, Services> {
	readonly harness: Effect.Effect<Harness, never, Services | DatabaseRequirement>;
	readonly layer: Layer.Layer<Services, never, DatabaseRequirement>;
}

export const makeEffectApp = <Harness, Services>(makeApp: (temporary: TemporaryPersistence) => Effect.Effect<EffectApp<Harness, Services>>) =>
	function effectApp<A, E>(
		name: string,
		...args:
			| readonly [body: EffectAppBody<Harness, A, E, Services>]
			| readonly [options: EffectAppOptions, body: EffectAppBody<Harness, A, E, Services>]
	): void {
		const live = args.length === 2;
		const body = args.length === 1 ? args[0] : args[1];
		const runBody = (harness: Harness) =>
			Effect.gen(function* () {
				return yield* body(harness);
			});
		workerIt(name, ({ antumbraApp, signal }) => {
			const program = makeApp(antumbraApp.temporary).pipe(
				Effect.flatMap((app) => app.harness.pipe(Effect.flatMap(runBody), Effect.provide(app.layer))),
				Effect.provide(antumbraApp.context),
				Effect.scoped,
			);
			return Effect.runPromise(live ? program : program.pipe(Effect.provide(testEnvironment)), { signal });
		});
	};
