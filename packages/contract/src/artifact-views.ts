import { Schema } from "effect";

export const ArtifactView = Schema.Struct({
	authorAgentId: Schema.NullOr(Schema.String),
	byteSize: Schema.Number,
	digest: Schema.String,
	id: Schema.String,
	title: Schema.String,
});
export type ArtifactView = typeof ArtifactView.Type;

export const ArtifactMarkdown = Schema.Struct({
	artifactId: Schema.String,
	byteSize: Schema.Number,
	digest: Schema.String,
	markdown: Schema.String,
	title: Schema.String,
});
export type ArtifactMarkdown = typeof ArtifactMarkdown.Type;

export const ArtifactHistoryView = Schema.Struct({
	...ArtifactView.fields,
	successorArtifactId: Schema.String,
});
export type ArtifactHistoryView = typeof ArtifactHistoryView.Type;
