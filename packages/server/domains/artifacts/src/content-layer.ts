import { Effect } from "effect";
import { readArtifact } from "#acts/read.ts";
import { artifactContent } from "#rpc.ts";
export const artifactContentHandlers = artifactContent.toLayer(Effect.succeed({ "artifacts.read": ({ artifactId }) => readArtifact(artifactId) }));
