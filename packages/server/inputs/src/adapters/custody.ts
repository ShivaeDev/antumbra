import { join } from "node:path";
import { ImageUnavailable } from "@antumbra/domain-inputs/commands/errors.ts";
import type { SessionImageMediaType } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect, FileSystem } from "effect";

const extensionOf = (mediaType: SessionImageMediaType): string => {
	switch (mediaType) {
		case "image/jpeg":
			return "jpg";
		case "image/png":
			return "png";
		case "image/webp":
			return "webp";
	}
};
export const imagePath = (root: string, digest: string, mediaType: SessionImageMediaType): string =>
	join(root, digest, `image.${extensionOf(mediaType)}`);
const custodyFailure = () => new ImageUnavailable({ detail: "the app-owned image file could not be verified" });
export const publishImage = Effect.fn("InputFiles.publish")(function* (
	root: string,
	digest: string,
	mediaType: SessionImageMediaType,
	bytes: Uint8Array,
) {
	const fs = yield* FileSystem.FileSystem;
	const directory = join(root, digest);
	const destination = imagePath(root, digest, mediaType);
	yield* fs.makeDirectory(directory, { recursive: true });
	yield* fs.writeFile(destination, bytes);
	return destination;
}, Effect.mapError(custodyFailure));
export const readImage = Effect.fn("InputFiles.read")(function* (root: string, digest: string, mediaType: SessionImageMediaType) {
	return yield* (yield* FileSystem.FileSystem).readFile(imagePath(root, digest, mediaType));
}, Effect.mapError(custodyFailure));
