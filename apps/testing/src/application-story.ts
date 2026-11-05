import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { kit } from "@antumbra/server-journal/testing/kit.ts";
import type { TestApp } from "@antumbra/server-journal/testing/surface.ts";
import { storyKit } from "@shivaedev/test-story/server/storyKit.ts";
import { Effect, Layer } from "effect";
import { definition, layer } from "#app.ts";
import { ScriptedArtifacts } from "#artifacts.ts";

export type App = TestApp<typeof definition.features> & { readonly artifacts: ScriptedArtifacts["Service"] };

const create = Effect.fn("ApplicationStory.create")(function* () {
	const services = yield* Layer.build(layer);
	const app = yield* Effect.gen(function* () {
		const parts = yield* kit(definition);
		const api = yield* apiOf(definition);
		const artifacts = yield* ScriptedArtifacts;
		return { ...parts, api, artifacts };
	}).pipe(Effect.provideContext(services));
	return { app, services };
});

export const applicationStory = storyKit({
	name: "Antumbra application",
	clock: "test",
	stages: ["application"],
	create,
	after: { application: (engine) => engine.services },
	verbs: (engine) => engine.app,
	inspect: () => ({}),
});
