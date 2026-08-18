import {
	Crypto,
	Effect,
	FileSystem,
	Option,
	Path,
	type PlatformError,
} from "effect";
import { digestBytes, readOpened } from "#content.ts";
import { ArtifactPublicationFailed } from "#errors.ts";
import { syncOpened } from "#filesystem-durability.ts";

const sameObject = (
	opened: FileSystem.File.Info,
	resolved: FileSystem.File.Info,
): boolean =>
	opened.dev === resolved.dev &&
	Option.isSome(opened.ino) &&
	Option.isSome(resolved.ino) &&
	opened.ino.value === resolved.ino.value;

const verifyPublished = (
	destination: string,
	digest: string,
	byteSize: number,
) =>
	Effect.scoped(
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const file = yield* fs.open(destination, { flag: "r" });
			const info = yield* file.stat;
			const resolved = yield* fs.realPath(destination);
			const canonicalParent = yield* fs.realPath(path.dirname(destination));
			const canonicalDestination = path.join(
				canonicalParent,
				path.basename(destination),
			);
			const resolvedInfo = yield* fs.stat(resolved);
			if (
				resolved !== canonicalDestination ||
				info.type !== "File" ||
				resolvedInfo.type !== "File" ||
				!sameObject(info, resolvedInfo)
			) {
				return yield* new ArtifactPublicationFailed({
					detail: `published artifact path is not canonical at ${destination}`,
				});
			}
			if (info.size !== BigInt(byteSize)) {
				return yield* new ArtifactPublicationFailed({
					detail: `published artifact size mismatch at ${destination}`,
				});
			}
			const bytes = yield* readOpened(file, info.size);
			const observedDigest = yield* digestBytes(bytes);
			if (observedDigest !== digest) {
				return yield* new ArtifactPublicationFailed({
					detail: `published artifact digest mismatch at ${destination}`,
				});
			}
		}),
	);

const syncDirectory = (destination: string) =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		yield* syncOpened(path.dirname(destination));
	});

const ensureExistingDurable = (
	destination: string,
	digest: string,
	byteSize: number,
) =>
	Effect.gen(function* () {
		yield* verifyPublished(destination, digest, byteSize);
		yield* syncOpened(destination);
		yield* syncDirectory(destination);
	});

const recoverConcurrentPublish = (
	destination: string,
	digest: string,
	byteSize: number,
	cause: PlatformError.PlatformError,
) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		if (!(yield* fs.exists(destination))) {
			return yield* Effect.fail(cause);
		}
		yield* ensureExistingDurable(destination, digest, byteSize);
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
			yield* ensureExistingDurable(destination, digest, bytes.length);
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
						recoverConcurrentPublish(
							destination,
							digest,
							bytes.length,
							cause,
						).pipe(Effect.as(false)),
				),
			);
			if (installed) {
				yield* syncDirectory(destination);
			}
		}).pipe(Effect.ensuring(cleanup));
	});
