import { Effect, Layer } from "effect";
import { TestClock, TestConsole } from "effect/testing";
import { workerIt } from "#adapters/worker.ts";
import { type AppHarness, runWithApp } from "#app.ts";

const testEnvironment = Layer.mergeAll(TestClock.layer(), TestConsole.layer);

interface EffectAppOptions {
	readonly clock: "live";
}

type EffectAppBody<A, E> = (harness: AppHarness) => Effect.fn.Return<A, E>;

export function effectApp<A, E>(
	name: string,
	...args: readonly [body: EffectAppBody<A, E>] | readonly [options: EffectAppOptions, body: EffectAppBody<A, E>]
): void {
	const live = args.length === 2;
	const body = args.length === 1 ? args[0] : args[1];
	workerIt(name, ({ antumbraApp, signal }) => {
		const program = runWithApp(body).pipe(Effect.provide(antumbraApp.context), Effect.scoped);
		return Effect.runPromise(live ? program : program.pipe(Effect.provide(testEnvironment)), { signal });
	});
}
