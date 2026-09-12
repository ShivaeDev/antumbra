import { Effect, Path } from "effect";
import { digestBytes } from "#adapters/artifacts/content.ts";
import { ArtifactPublicationFailed } from "#adapters/artifacts/errors.ts";
import { ensureDurableDirectory } from "#adapters/artifacts/filesystem-durability.ts";
import type { ArtifactBytes } from "#adapters/artifacts/ports.ts";
import { installPublished } from "#adapters/artifacts/published-file.ts";
import { ArtifactStorage } from "#adapters/artifacts/storage.ts";
export const publishArtifact = Effect.fn("ArtifactFiles.publish")(
	function* (source: ArtifactBytes) {
		const { root } = yield* ArtifactStorage;
		const path = yield* Path.Path;
		const digest = yield* digestBytes(source.bytes);
		const directory = path.join(root, digest);
		yield* ensureDurableDirectory(root);
		yield* ensureDurableDirectory(directory);
		yield* installPublished(path.join(directory, source.basename), source.bytes, digest);
		return { basename: source.basename, digest, byteSize: source.bytes.length };
	},
	Effect.mapError((cause) => new ArtifactPublicationFailed({ detail: String(cause) })),
);
