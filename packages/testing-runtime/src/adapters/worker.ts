import { temporaryPersistence as makeTemporaryPersistence, type TemporaryPersistence } from "@antumbra/persistence/testing";
import { it as vitestIt } from "@effect/vitest";
import { type Context, Effect, Exit, Layer, Scope } from "effect";

export interface AppWorker {
	readonly context: Context.Context<Layer.Success<TemporaryPersistence["layer"]>>;
	readonly temporary: TemporaryPersistence;
}

const temporaryIt = vitestIt.extend("temporaryPersistence", { scope: "worker" }, { make: makeTemporaryPersistence });

export const workerIt = temporaryIt.extend("antumbraApp", { scope: "worker" }, ({ temporaryPersistence }, { onCleanup }) => {
	const temporary = temporaryPersistence.make();
	const scope = Effect.runSync(Scope.make());
	onCleanup(() => Effect.runPromise(Scope.close(scope, Exit.void).pipe(Effect.ensuring(Effect.sync(temporary.remove)))));
	return Effect.runPromise(Layer.buildWithScope(temporary.layer, scope)).then((context) => ({ context, temporary }) satisfies AppWorker);
});
