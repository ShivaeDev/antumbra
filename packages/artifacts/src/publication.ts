import { Crypto, Effect, Path } from "effect";
import { artifactPublicationFailed } from "#errors.ts";
import { ensureDurableDirectory } from "#filesystem-durability.ts";
import type {
	ArtifactInput,
	ArtifactPublication,
	LocalPublication,
} from "#model.ts";
import { installPublished } from "#published-file.ts";
import { readOwnedArtifact } from "#source.ts";

const isExternal = (uri: string): boolean =>
	uri.startsWith("https://") || uri.startsWith("http://");

const hex = (bytes: Uint8Array): string =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const publishLocal = (root: string, input: ArtifactInput) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const path = yield* Path.Path;
		const owned = yield* readOwnedArtifact(input);
		const bytes = owned.bytes;
		const digest = hex(
			yield* crypto
				.digest("SHA-256", bytes)
				.pipe(Effect.mapError(artifactPublicationFailed("hash artifact"))),
		);
		const directory = path.join(root, digest);
		const destination = path.join(directory, owned.filename);
		yield* ensureDurableDirectory(root).pipe(
			Effect.andThen(ensureDurableDirectory(directory)),
			Effect.mapError(artifactPublicationFailed("prepare artifact directory")),
		);
		yield* installPublished(destination, bytes, digest).pipe(
			Effect.mapError(artifactPublicationFailed("publish artifact")),
		);
		const url = yield* path
			.toFileUrl(destination)
			.pipe(Effect.mapError(artifactPublicationFailed("name artifact")));
		return {
			_tag: "local",
			agentId: owned.agentId,
			moorageRoot: owned.moorageRoot,
			uri: url.toString(),
		} satisfies LocalPublication;
	});

export const publishArtifact = (root: string, input: ArtifactInput) =>
	isExternal(input.uri)
		? Effect.succeed<ArtifactPublication>({
				_tag: "external",
				uri: input.uri,
			})
		: publishLocal(root, input);
