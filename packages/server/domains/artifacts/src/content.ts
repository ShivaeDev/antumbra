import { Schema } from "effect";
import { ArtifactId } from "#ids.ts";
export const MAX_ARTIFACT_MARKDOWN_BYTES = 1_048_576;
export const ArtifactMarkdown = Schema.Struct({
	artifactId: ArtifactId,
	title: Schema.String,
	markdown: Schema.String,
	digest: Schema.String,
	byteSize: Schema.Number,
});
export type ArtifactMarkdown = typeof ArtifactMarkdown.Type;
export class ArtifactSourceNotOwned extends Schema.TaggedError<ArtifactSourceNotOwned>()("ArtifactSourceNotOwned", {
	agentId: Schema.NullOr(Schema.String),
	path: Schema.String,
}) {}
export class ArtifactContentInvalid extends Schema.TaggedError<ArtifactContentInvalid>()("ArtifactContentInvalid", {
	path: Schema.String,
	reason: Schema.Literals(["absolute_path", "empty_path", "not_utf8", "too_large", "uri"]),
}) {}
export class ArtifactPublicationFailed extends Schema.TaggedError<ArtifactPublicationFailed>()("ArtifactPublicationFailed", {
	detail: Schema.String,
}) {}
export class StoredArtifactContentInvalid extends Schema.TaggedError<StoredArtifactContentInvalid>()("StoredArtifactContentInvalid", {
	artifactId: ArtifactId,
	reason: Schema.Literals(["digest", "not_file", "path", "size"]),
}) {}
