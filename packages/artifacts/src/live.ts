import { Layer } from "effect";
import { Artifacts } from "#artifacts.ts";
import { ArtifactStorage } from "#storage.ts";

export const ArtifactsLive = (root: string) => Artifacts.layer.pipe(Layer.provide(Layer.succeed(ArtifactStorage)({ root })));
