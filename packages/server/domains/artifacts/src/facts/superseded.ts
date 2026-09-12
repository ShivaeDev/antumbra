import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { ArtifactId } from "#ids.ts";
export const artifactSuperseded = fact("ArtifactSuperseded", {
	supersededArtifactId: ArtifactId,
	successorArtifactId: ArtifactId,
	actorAgentId: Schema.NullOr(Schema.String),
});
