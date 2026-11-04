import { Schema } from "effect";
import { ArtifactId } from "#artifacts-ids.ts";
import { PieceId } from "#piece.ts";
export const Artifact = Schema.Struct({
	id: ArtifactId,
	pieceId: PieceId,
	authorAgentId: Schema.NullOr(Schema.String),
	title: Schema.String,
	digest: Schema.String,
	byteSize: Schema.Number,
	basename: Schema.String,
	supersededByArtifactId: Schema.NullOr(ArtifactId),
	createdAt: Schema.Number,
});
