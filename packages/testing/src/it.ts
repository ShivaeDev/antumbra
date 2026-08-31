import type { Database } from "@antumbra/persistence";
import { type Context, Effect, Layer } from "effect";
import { TestClock, TestConsole } from "effect/testing";
import { workerIt } from "#adapters/worker.ts";

const testEnvironment = Layer.mergeAll(TestClock.layer(), TestConsole.layer);

interface EffectAppOptions {
	readonly clock: "live";
}

type EffectAppBody<Harness, A, E, Requirements> = (harness: Harness) => Effect.fn.Return<A, E, Requirements>;

export const makeEffectApp = <Harness, Requirements>(
	runWithApp: <A, E>(body: EffectAppBody<Harness, A, E, Requirements>) => Effect.Effect<A, E, Context.Service.Identifier<typeof Database>>,
) =>
	function effectApp<A, E>(
		name: string,
		...args:
			| readonly [body: EffectAppBody<Harness, A, E, Requirements>]
			| readonly [options: EffectAppOptions, body: EffectAppBody<Harness, A, E, Requirements>]
	): void {
		const live = args.length === 2;
		const body = args.length === 1 ? args[0] : args[1];
		workerIt(name, ({ antumbraApp, signal }) => {
			const program = runWithApp(body).pipe(Effect.provide(antumbraApp.context), Effect.scoped);
			return Effect.runPromise(live ? program : program.pipe(Effect.provide(testEnvironment)), { signal });
		});
	};
