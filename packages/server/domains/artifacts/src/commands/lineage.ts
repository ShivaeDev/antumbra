import { ArtifactId } from "@antumbra/platform-vocabulary/artifacts-ids.ts";
import { Schema } from "effect";
export const lineageInput = { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId, actorAgentId: Schema.NullOr(Schema.String) };
export const lineageRejections = {
	ArtifactNotFound: { artifactId: ArtifactId },
	ArtifactProvenanceConflict: { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId },
	ArtifactSupersessionUnauthorized: { actorAgentId: Schema.String },
	ArtifactLineageConflict: {
		conflict: Schema.Literals(["cycle", "successor_artifact_already_has_predecessor", "superseded_artifact_already_has_successor"]),
	},
	ArtifactSupersessionNotFound: { supersededArtifactId: ArtifactId, successorArtifactId: ArtifactId },
};
