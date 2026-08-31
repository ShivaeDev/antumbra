import { Crypto, Effect, type FileSystem, Option, type PlatformError } from "effect";

export const MAX_ARTIFACT_MARKDOWN_BYTES = 1_048_576;

export type ArtifactContentInvalidReason = "absolute_path" | "empty_path" | "not_utf8" | "too_large" | "uri";

export const isRelativeArtifactPath = (value: string): boolean =>
	value.length > 0 && !value.startsWith("/") && !value.startsWith("\\") && !/^[A-Za-z]:[\\/]/.test(value) && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value);

export const sameObject = (opened: FileSystem.File.Info, resolved: FileSystem.File.Info): boolean =>
	opened.dev === resolved.dev && Option.isSome(opened.ino) && Option.isSome(resolved.ino) && opened.ino.value === resolved.ino.value;

export const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const digestBytes = (bytes: Uint8Array) =>
	Crypto.Crypto.pipe(
		Effect.flatMap((crypto) => crypto.digest("SHA-256", bytes)),
		Effect.map(hex),
	);

const concatenate = (chunks: ReadonlyArray<Uint8Array>, length: number): Uint8Array => {
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return bytes;
};

export const readOpened = (
	file: FileSystem.File,
	remaining: bigint,
	chunks: ReadonlyArray<Uint8Array> = [],
	length = 0,
): Effect.Effect<Uint8Array, PlatformError.PlatformError> => {
	if (remaining === 0n) {
		return Effect.succeed(concatenate(chunks, length));
	}
	const requested = Number(remaining > 65_536n ? 65_536n : remaining);
	return file.readAlloc(requested).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => Effect.succeed(concatenate(chunks, length)),
				onSome: (chunk) => readOpened(file, remaining - BigInt(chunk.length), [...chunks, chunk], length + chunk.length),
			}),
		),
	);
};

export const decodeMarkdown = (bytes: Uint8Array): string => new TextDecoder("utf-8", { fatal: true }).decode(bytes);
