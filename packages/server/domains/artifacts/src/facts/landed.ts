import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { ArtifactId } from "#ids.ts";
export const artifactLanded = fact("ArtifactLanded", {
	id: ArtifactId,
	pieceId: PieceId,
	authorAgentId: Schema.NullOr(Schema.String),
	title: Schema.String,
	digest: Schema.String,
	byteSize: Schema.Number,
	basename: Schema.String,
	supersedesArtifactId: Schema.NullOr(ArtifactId),
});
