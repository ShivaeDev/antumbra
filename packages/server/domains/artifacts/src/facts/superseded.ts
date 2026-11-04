import { fact } from "@antumbra/platform-feature/fact.ts";
import { ArtifactSupersededPayload } from "@antumbra/platform-vocabulary/artifacts-event.ts";
export const artifactSuperseded = fact("ArtifactSuperseded", ArtifactSupersededPayload.fields);
