import type { Database } from "@antumbra/persistence";
import { type TemporaryPersistence, withTestTransaction } from "@antumbra/persistence/testing";
import { type Context, Effect, Layer, type Scope } from "effect";
import { TestClock, TestConsole } from "effect/testing";
import { workerIt } from "#adapters/worker.ts";

const testEnvironment = Layer.mergeAll(TestClock.layer(), TestConsole.layer);

interface EffectAppOptions {
	readonly clock: "live";
}

type DatabaseRequirement = Context.Service.Identifier<typeof Database>;

type EffectAppBody<Harness, A, Services> = (harness: Harness) => Effect.fn.Return<A, unknown, Services | DatabaseRequirement | Scope.Scope>;

interface EffectApp<Harness, Services> {
	readonly harness: Effect.Effect<Harness, never, Services | DatabaseRequirement | Scope.Scope>;
	readonly layer: Layer.Layer<Services, never, DatabaseRequirement>;
}

export const makeEffectApp = <Harness, Services, Providers = never>(
	makeApp: (temporary: TemporaryPersistence, providers?: Providers) => Effect.Effect<EffectApp<Harness, Services>, never, Scope.Scope>,
) => {
	function effectApp<A>(
		name: string,
		...args: readonly [body: EffectAppBody<Harness, A, Services>] | readonly [options: EffectAppOptions, body: EffectAppBody<Harness, A, Services>]
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
				Effect.scoped,
				withTestTransaction,
				Effect.provide(antumbraApp.context),
			);
			return Effect.runPromise(live ? program : program.pipe(Effect.provide(testEnvironment)), { signal });
		});
	}
	function withProviders<State, A>(
		name: string,
		setup: Effect.Effect<{ readonly providers: Providers; readonly state: State }, never, Scope.Scope>,
		body: (harness: Harness, state: State) => Effect.fn.Return<A, unknown, Services | DatabaseRequirement | Scope.Scope>,
	): void {
		const configured = makeEffectApp((temporary) =>
			setup.pipe(
				Effect.flatMap(({ providers, state }) =>
					makeApp(temporary, providers).pipe(
						Effect.map((app) => ({ ...app, harness: app.harness.pipe(Effect.map((harness) => ({ harness, state }))) })),
					),
				),
			),
		);
		configured(name, function* ({ harness, state }) {
			return yield* body(harness, state);
		});
	}
	return Object.assign(effectApp, { withProviders });
};
