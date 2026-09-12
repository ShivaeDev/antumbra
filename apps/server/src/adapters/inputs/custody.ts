import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageUnavailable } from "@antumbra/domain-inputs/commands/errors.ts";
import type { SessionImageMediaType } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";

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

const custodyFailure = (_cause: unknown) =>
	new ImageUnavailable({
		detail: "the app-owned image file could not be verified",
	});

export const publishImage = (
	root: string,
	digest: string,
	mediaType: SessionImageMediaType,
	bytes: Uint8Array,
): Effect.Effect<string, ImageUnavailable> =>
	Effect.tryPromise({
		catch: custodyFailure,
		try: async () => {
			const directory = join(root, digest);
			const destination = imagePath(root, digest, mediaType);
			await mkdir(directory, { recursive: true });
			await writeFile(destination, bytes);
			return destination;
		},
	});

export const readImage = (root: string, digest: string, mediaType: SessionImageMediaType): Effect.Effect<Uint8Array, ImageUnavailable> =>
	Effect.tryPromise({
		catch: custodyFailure,
		try: async () => new Uint8Array(await readFile(imagePath(root, digest, mediaType))),
	});
