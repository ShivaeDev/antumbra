import { Effect, type FileSystem, Option, type PlatformError } from "effect";
import { Digest } from "effect/crypto";

export const digestBytes = (bytes: Uint8Array) => Digest.Digest.pipe(Effect.flatMap((digest) => digest.digestHex(Digest.sha256, bytes)));

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
