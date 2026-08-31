import { Crypto, Effect, FileSystem, Path } from "effect";
import { digestBytes } from "#content.ts";
import { ArtifactPublicationFailed } from "#errors.ts";
import { syncOpened } from "#filesystem-durability.ts";

const verifyPublished = (destination: string, digest: string, byteSize: number) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const bytes = yield* fs.readFile(destination);
		if (bytes.length !== byteSize) {
			return yield* new ArtifactPublicationFailed({
				detail: `published artifact size mismatch at ${destination}`,
			});
		}
		const observedDigest = yield* digestBytes(bytes);
		if (observedDigest !== digest) {
			return yield* new ArtifactPublicationFailed({
				detail: `published artifact digest mismatch at ${destination}`,
			});
		}
	});

const syncDirectory = (destination: string) =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		yield* syncOpened(path.dirname(destination));
	});

const ensureExistingDurable = (destination: string, digest: string, byteSize: number) =>
	Effect.gen(function* () {
		yield* verifyPublished(destination, digest, byteSize);
		yield* syncOpened(destination);
		yield* syncDirectory(destination);
	});

const writeSynced = (target: string, bytes: Uint8Array) =>
	Effect.scoped(
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const file = yield* fs.open(target, { flag: "wx" });
			yield* file.writeAll(bytes);
			yield* file.sync;
		}),
	);

export const installPublished = (destination: string, bytes: Uint8Array, digest: string) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		if (yield* fs.exists(destination)) {
			yield* ensureExistingDurable(destination, digest, bytes.length);
			return;
		}
		const temporary = path.join(path.dirname(destination), `.publish-${yield* crypto.randomUUIDv4}`);
		const cleanup = fs.remove(temporary, { force: true }).pipe(Effect.catchCause(() => Effect.void));
		yield* Effect.gen(function* () {
			yield* writeSynced(temporary, bytes);
			yield* fs.rename(temporary, destination);
			yield* syncDirectory(destination);
		}).pipe(Effect.ensuring(cleanup));
	});
