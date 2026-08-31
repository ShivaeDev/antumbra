import {
	MAX_SESSION_IMAGE_EDGE,
	MAX_SESSION_IMAGE_PIXELS,
	MAX_SESSION_IMAGE_SOURCE_BYTES,
	MAX_SESSION_IMAGE_STORED_BYTES,
	type SessionImageMediaType,
} from "@antumbra/vocabulary/session-input";
import { Effect } from "effect";
import sharp, { type Sharp } from "sharp";
import { digestBytes } from "#digest.ts";
import { SessionInputInvalid } from "#errors.ts";

interface NormalizedImage {
	readonly bytes: Uint8Array;
	readonly digest: string;
	readonly height: number;
	readonly mediaType: SessionImageMediaType;
	readonly width: number;
}

const corrupt = (detail: string) => new SessionInputInvalid({ detail, reason: "corrupt_image" });

const encode = (format: string, pipeline: Sharp): Sharp | undefined => {
	switch (format) {
		case "jpeg":
			return pipeline.jpeg({ mozjpeg: true, quality: 90 });
		case "png":
			return pipeline.png({ compressionLevel: 9, effort: 10 });
		case "webp":
			return pipeline.webp({ effort: 6, quality: 90 });
		default:
			return undefined;
	}
};

const mediaTypeOf = (format: string): SessionImageMediaType | undefined => {
	switch (format) {
		case "jpeg":
			return "image/jpeg";
		case "png":
			return "image/png";
		case "webp":
			return "image/webp";
		default:
			return undefined;
	}
};

export const normalizeImage = (bytes: Uint8Array): Effect.Effect<NormalizedImage, SessionInputInvalid> => {
	if (bytes.length > MAX_SESSION_IMAGE_SOURCE_BYTES) {
		return Effect.fail(
			new SessionInputInvalid({
				detail: `${bytes.length} bytes exceeds the ${MAX_SESSION_IMAGE_SOURCE_BYTES} byte source limit`,
				reason: "image_too_large",
			}),
		);
	}
	return Effect.tryPromise({
		catch: (cause) => (cause instanceof SessionInputInvalid ? cause : corrupt("image could not be decoded")),
		try: async () => {
			const source = sharp(bytes, {
				failOn: "error",
				limitInputPixels: MAX_SESSION_IMAGE_PIXELS,
				sequentialRead: true,
			});
			const metadata = await source.metadata();
			const format = metadata.format ?? "";
			const pipeline = source
				.rotate()
				.resize({
					fit: "inside",
					height: MAX_SESSION_IMAGE_EDGE,
					width: MAX_SESSION_IMAGE_EDGE,
					withoutEnlargement: true,
				})
				.toColourspace("srgb");
			const encoded = encode(format, pipeline);
			if (encoded === undefined) {
				return Promise.reject(
					new SessionInputInvalid({
						detail: `decoded format ${format || "unknown"} is not supported`,
						reason: "unsupported_media",
					}),
				);
			}
			const { data, info } = await encoded.toBuffer({
				resolveWithObject: true,
			});
			if (data.length > MAX_SESSION_IMAGE_STORED_BYTES) {
				return Promise.reject(
					new SessionInputInvalid({
						detail: `${data.length} normalized bytes exceeds the ${MAX_SESSION_IMAGE_STORED_BYTES} byte stored limit`,
						reason: "image_too_large",
					}),
				);
			}
			const mediaType = mediaTypeOf(info.format);
			if (mediaType === undefined) {
				return Promise.reject(
					new SessionInputInvalid({
						detail: `normalized format ${info.format || "unknown"} is not supported`,
						reason: "unsupported_media",
					}),
				);
			}
			return {
				bytes: new Uint8Array(data),
				digest: "",
				height: info.height,
				mediaType,
				width: info.width,
			};
		},
	}).pipe(
		Effect.map((image) => ({
			...image,
			digest: digestBytes(image.bytes),
		})),
	);
};
