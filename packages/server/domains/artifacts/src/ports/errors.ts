import { Schema } from "effect";
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
