import { Layer } from "effect";
import { Artifacts } from "#service.ts";
import { ArtifactStorage } from "#storage.ts";

export const artifactsLayer = (root: string) => Artifacts.layer.pipe(Layer.provide(Layer.succeed(ArtifactStorage)({ root })));
