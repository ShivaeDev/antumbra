import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { snapshotJournal } from "@antumbra/server-journal/testing/snapshot.ts";
import { Effect, Layer } from "effect";
import { Reactivity } from "effect/reactivity";
import { definition, layer } from "#app.ts";
import { prepareArtifactSource } from "#artifact-source.ts";
import { landArtifact, readArtifact, ScriptedArtifacts } from "#artifacts.ts";
import { inputApi } from "#inputs.ts";
import { connectRunner } from "#runner.ts";

export const journalComparison = Effect.fn("PostgresApp.journalComparison")(function* () {
	const services = yield* Layer.build(layer);
	const artifacts = yield* ScriptedArtifacts.pipe(Effect.provideContext(services));
	const api = yield* apiOf(definition).pipe(Effect.provideContext(services));
	const reactivity = yield* Reactivity.Reactivity.pipe(Effect.provideContext(services));
	const inputs = yield* inputApi.pipe(Effect.provideContext(services));
	return {
		api,
		inputs,
		artifact: {
			source: (path: string, content: string) => Effect.sync(() => artifacts.source.set(path, content)),
			prepare: (seed: string) => prepareArtifactSource({ seed }).pipe(Effect.provideContext(services)),
			land: (input: Parameters<typeof landArtifact>[0]) => landArtifact(input).pipe(Effect.provideContext(services)),
			read: (id: Parameters<typeof readArtifact>[0]) => readArtifact(id).pipe(Effect.provideContext(services)),
		},
		runner: (registration: Parameters<typeof connectRunner>[0]) => connectRunner(registration).pipe(Effect.provideContext(services)),
		snapshot: (filename: string) => snapshotJournal(filename).pipe(Effect.provideContext(services)),
		watchKeys: (keys: readonly string[]) =>
			Effect.gen(function* () {
				const seen: string[] = [];
				const cancel = keys.map((key) =>
					reactivity.registerUnsafe([key], () => {
						seen.push(key);
					}),
				);
				yield* Effect.addFinalizer(() =>
					Effect.sync(() => {
						for (const close of cancel) close();
					}),
				);
				return {
					seen: () => [...seen],
					clear: () => {
						seen.length = 0;
					},
				};
			}),
	};
});
