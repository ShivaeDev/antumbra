import { fact } from "@antumbra/platform-feature/fact.ts";
import { ArtifactLandedPayload } from "@antumbra/platform-vocabulary/artifacts-event.ts";
export const artifactLanded = fact("ArtifactLanded", ArtifactLandedPayload.fields);
