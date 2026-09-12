import { Schema } from "effect";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";
import { land } from "#commands/land.ts";
import { ArtifactId } from "#ids.ts";
export const ArtifactMarkdown = Schema.Struct({
	artifactId: ArtifactId,
	title: Schema.String,
	markdown: Schema.String,
	digest: Schema.String,
	byteSize: Schema.Number,
});
export type ArtifactMarkdown = typeof ArtifactMarkdown.Type;
export class StoredArtifactContentInvalid extends Schema.TaggedError<StoredArtifactContentInvalid>()("StoredArtifactContentInvalid", {
	artifactId: ArtifactId,
	reason: Schema.Literals(["digest", "not_file", "path", "size"]),
}) {}

export const artifactContent = RpcGroup.make(
	Rpc.make("content.read", {
		payload: { artifactId: ArtifactId },
		success: ArtifactMarkdown,
		error: Schema.Union([land.Rejection.ArtifactNotFound, StoredArtifactContentInvalid]),
	}),
);
