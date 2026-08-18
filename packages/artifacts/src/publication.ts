import { Effect, Path } from "effect";
import { digestBytes } from "#content.ts";
import { artifactPublicationFailed } from "#errors.ts";
import { ensureDurableDirectory } from "#filesystem-durability.ts";
import type { ArtifactInput, ArtifactPublication } from "#model.ts";
import { installPublished } from "#published-file.ts";
import { readOwnedArtifact } from "#source.ts";

export const publishArtifact = (root: string, input: ArtifactInput) =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		const owned = yield* readOwnedArtifact(input);
		const bytes = owned.bytes;
		const digest = yield* digestBytes(bytes).pipe(
			Effect.mapError(artifactPublicationFailed("hash artifact")),
		);
		const directory = path.join(root, digest);
		const destination = path.join(directory, owned.basename);
		yield* ensureDurableDirectory(root).pipe(
			Effect.andThen(ensureDurableDirectory(directory)),
			Effect.mapError(artifactPublicationFailed("prepare artifact directory")),
		);
		yield* installPublished(destination, bytes, digest).pipe(
			Effect.mapError(artifactPublicationFailed("publish artifact")),
		);
		return {
			agentId: owned.agentId,
			basename: owned.basename,
			byteSize: bytes.length,
			digest,
			moorageRoot: owned.moorageRoot,
		} satisfies ArtifactPublication;
	});
