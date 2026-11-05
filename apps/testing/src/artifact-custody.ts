import { artifactFiles } from "@antumbra/server/adapters/artifacts/layer.ts";
import { ArtifactStorage } from "@antumbra/server/adapters/artifacts/storage.ts";
import { Artifacts } from "@antumbra/server-artifacts/service.ts";
import { Context, Effect, FileSystem, Layer } from "effect";
import { applicationStory } from "#application-story.ts";

export const artifactCustody = applicationStory.trait("application", "Artifacts enter app-managed filesystem custody", (engine) =>
	Effect.gen(function* () {
		const root = yield* (yield* FileSystem.FileSystem).makeTempDirectoryScoped();
		const files = artifactFiles.pipe(Layer.provideMerge(Layer.succeed(ArtifactStorage, { root })));
		const services = yield* Layer.build(
			Layer.fresh(Artifacts.layer).pipe(Layer.provideMerge(files), Layer.provide(Layer.succeedContext(engine.services))),
		);
		engine.services = Context.merge(engine.services, services);
	}),
);
