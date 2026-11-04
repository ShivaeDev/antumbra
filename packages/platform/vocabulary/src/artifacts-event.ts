import { Schema } from "effect";
import { ArtifactId } from "#artifacts-ids.ts";
import { PieceId } from "#piece.ts";
export const ArtifactLandedPayload = Schema.Struct({
	id: ArtifactId,
	pieceId: PieceId,
	authorAgentId: Schema.NullOr(Schema.String),
	title: Schema.String,
	digest: Schema.String,
	byteSize: Schema.Number,
	basename: Schema.String,
	supersedesArtifactId: Schema.NullOr(ArtifactId),
});
export const ArtifactSupersededPayload = Schema.Struct({
	supersededArtifactId: ArtifactId,
	successorArtifactId: ArtifactId,
	actorAgentId: Schema.NullOr(Schema.String),
});
export const ArtifactSupersessionRemovedPayload = Schema.Struct({
	supersededArtifactId: ArtifactId,
	successorArtifactId: ArtifactId,
	actorAgentId: Schema.NullOr(Schema.String),
});
export const ArtifactsEvent = Schema.Union([
	Schema.Struct({ _tag: Schema.Literal("ArtifactLanded"), ...ArtifactLandedPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ArtifactSuperseded"), ...ArtifactSupersededPayload.fields, at: Schema.Number }),
	Schema.Struct({ _tag: Schema.Literal("ArtifactSupersessionRemoved"), ...ArtifactSupersessionRemovedPayload.fields, at: Schema.Number }),
]);
