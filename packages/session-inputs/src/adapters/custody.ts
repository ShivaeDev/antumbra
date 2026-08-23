import {
	chmod,
	lstat,
	mkdir,
	open,
	readFile,
	rename,
	unlink,
} from "node:fs/promises";
import { join } from "node:path";
import type { SessionImageMediaType } from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import { digestBytes } from "#digest.ts";
import { SessionInputCustodyFailed } from "#errors.ts";

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

export const imagePath = (
	root: string,
	digest: string,
	mediaType: SessionImageMediaType,
): string => join(root, digest, `image.${extensionOf(mediaType)}`);

const custodyFailure = (_cause: unknown) =>
	new SessionInputCustodyFailed({
		detail: "the app-owned image file could not be verified",
	});

export const publishImage = (
	root: string,
	digest: string,
	mediaType: SessionImageMediaType,
	bytes: Uint8Array,
): Effect.Effect<string, SessionInputCustodyFailed> =>
	Effect.tryPromise({
		catch: custodyFailure,
		try: async () => {
			const directory = join(root, digest);
			const destination = imagePath(root, digest, mediaType);
			const temporary = join(directory, `.install-${crypto.randomUUID()}`);
			await mkdir(root, { mode: 0o700, recursive: true });
			await chmod(root, 0o700);
			await mkdir(directory, { mode: 0o700, recursive: true });
			await chmod(directory, 0o700);
			const file = await open(temporary, "wx", 0o600);
			try {
				await file.writeFile(bytes);
				await file.sync();
			} finally {
				await file.close();
			}
			await rename(temporary, destination).catch((cause: unknown) =>
				unlink(temporary)
					.catch(() => undefined)
					.then(() => Promise.reject(cause)),
			);
			await chmod(destination, 0o600);
			const parent = await open(directory, "r");
			try {
				await parent.sync();
			} finally {
				await parent.close();
			}
			return destination;
		},
	});

export const readImage = (
	root: string,
	digest: string,
	mediaType: SessionImageMediaType,
	byteSize: number,
): Effect.Effect<Uint8Array, SessionInputCustodyFailed> =>
	Effect.tryPromise({
		catch: custodyFailure,
		try: async () => {
			const path = imagePath(root, digest, mediaType);
			const stat = await lstat(path);
			if (!stat.isFile() || stat.isSymbolicLink()) {
				return Promise.reject(
					new Error("stored image is not a regular owned file"),
				);
			}
			const bytes = new Uint8Array(await readFile(path));
			if (bytes.length !== byteSize || digestBytes(bytes) !== digest) {
				return Promise.reject(
					new Error("stored image no longer matches its custody record"),
				);
			}
			return bytes;
		},
	});
