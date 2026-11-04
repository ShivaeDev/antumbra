import { fact } from "@antumbra/platform-feature/fact.ts";
import { ArtifactSupersessionRemovedPayload } from "@antumbra/platform-vocabulary/artifacts-event.ts";
export const artifactSupersessionRemoved = fact("ArtifactSupersessionRemoved", ArtifactSupersessionRemovedPayload.fields);
