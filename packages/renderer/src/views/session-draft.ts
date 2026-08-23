import {
	MAX_SESSION_IMAGE_SOURCE_BYTES,
	MAX_SESSION_IMAGES,
} from "@antumbra/vocabulary/session-input";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS = [".jpeg", ".jpg", ".png", ".webp"];

export interface DraftImage {
	readonly file: File;
	readonly id: string;
	readonly url: string;
}

export const imageFileIssue = (
	file: File,
	currentCount: number,
): string | undefined => {
	if (currentCount >= MAX_SESSION_IMAGES) {
		return `too_many_images: attach no more than ${MAX_SESSION_IMAGES} images`;
	}
	const name = file.name.toLowerCase();
	if (!TYPES.has(file.type) && !EXTENSIONS.some((ext) => name.endsWith(ext))) {
		return `unsupported_media: ${file.name || "pasted image"} is not JPEG, PNG, or WebP`;
	}
	if (file.size > MAX_SESSION_IMAGE_SOURCE_BYTES) {
		return `image_too_large: ${file.name || "pasted image"} exceeds 10 MiB`;
	}
	return undefined;
};

export const makeDraftImage = (file: File): DraftImage => ({
	file,
	id: crypto.randomUUID(),
	url: URL.createObjectURL(file),
});

export const filesFromClipboard = (
	items: DataTransferItemList,
): ReadonlyArray<File> =>
	Array.from(items).flatMap((item) => {
		const file = item.kind === "file" ? item.getAsFile() : null;
		return file === null ? [] : [file];
	});
