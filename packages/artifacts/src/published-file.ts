import { Crypto, Effect, FileSystem, Path, type PlatformError } from "effect";
import { ArtifactPublicationFailed } from "#errors.ts";
import { syncOpened } from "#filesystem-durability.ts";

const hex = (bytes: Uint8Array): string =>
	Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const verifyPublished = (destination: string, digest: string) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const fs = yield* FileSystem.FileSystem;
		const bytes = yield* fs.readFile(destination);
		const observed = hex(yield* crypto.digest("SHA-256", bytes));
		if (observed !== digest) {
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

const ensureExistingDurable = (destination: string, digest: string) =>
	Effect.gen(function* () {
		yield* verifyPublished(destination, digest);
		yield* syncOpened(destination);
		yield* syncDirectory(destination);
	});

const recoverConcurrentPublish = (
	destination: string,
	digest: string,
	cause: PlatformError.PlatformError,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		if (!(yield* fs.exists(destination))) {
			return yield* Effect.fail(cause);
		}
		yield* ensureExistingDurable(destination, digest);
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

export const installPublished = (
	destination: string,
	bytes: Uint8Array,
	digest: string,
) =>
	Effect.gen(function* () {
		const crypto = yield* Crypto.Crypto;
		const fs = yield* FileSystem.FileSystem;
		const path = yield* Path.Path;
		if (yield* fs.exists(destination)) {
			yield* ensureExistingDurable(destination, digest);
			return;
		}
		const temporary = path.join(
			path.dirname(destination),
			`.publish-${yield* crypto.randomUUIDv4}`,
		);
		const cleanup = fs
			.remove(temporary, { force: true })
			.pipe(Effect.catchCause(() => Effect.void));
		yield* Effect.gen(function* () {
			yield* writeSynced(temporary, bytes);
			const installed = yield* fs.rename(temporary, destination).pipe(
				Effect.as(true),
				Effect.catchIf(
					(_error): _error is PlatformError.PlatformError => true,
					(cause) =>
						recoverConcurrentPublish(destination, digest, cause).pipe(
							Effect.as(false),
						),
				),
			);
			if (installed) {
				yield* syncDirectory(destination);
			}
		}).pipe(Effect.ensuring(cleanup));
	});
