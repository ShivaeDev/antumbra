import { artifactContent } from "@antumbra/domain-artifacts/rpc.ts";
import { Effect } from "effect";
import { readArtifact } from "#adapters/artifacts/acts/read.ts";
export const artifactContentHandlers = artifactContent.toLayer(Effect.succeed({ "artifacts.read": ({ artifactId }) => readArtifact(artifactId) }));
