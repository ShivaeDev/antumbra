import { Effect, FileSystem, Path, type PlatformError } from "effect";
import { ArtifactPublicationFailed } from "#errors.ts";

const hasReason =
	(tag: PlatformError.SystemErrorTag) =>
	(error: ArtifactPublicationFailed | PlatformError.PlatformError): boolean =>
		error._tag === "PlatformError" && error.reason._tag === tag;

const requireDirectory = (target: string) =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const info = yield* fs.stat(target);
		if (info.type !== "Directory") {
			return yield* new ArtifactPublicationFailed({
				detail: `artifact storage path is not a directory: ${target}`,
			});
		}
	});

const directoryExists = (target: string) =>
	requireDirectory(target).pipe(
		Effect.as(true),
		Effect.catchIf(hasReason("NotFound"), () => Effect.succeed(false)),
	);

const createDirectoryEntry = (target: string) =>
	FileSystem.FileSystem.use((fs) =>
		fs.makeDirectory(target).pipe(
			Effect.as(true),
			Effect.catchIf(hasReason("AlreadyExists"), () => Effect.succeed(false)),
		),
	);

export const syncOpened = (target: string) =>
	Effect.scoped(
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const file = yield* fs.open(target, { flag: "r" });
			yield* file.sync;
		}),
	);

export const ensureDurableDirectory = (
	target: string,
): Effect.Effect<
	boolean,
	ArtifactPublicationFailed | PlatformError.PlatformError,
	FileSystem.FileSystem | Path.Path
> =>
	Effect.gen(function* () {
		const path = yield* Path.Path;
		const parent = path.dirname(target);
		if (parent === target) {
			yield* requireDirectory(target);
			return false;
		}
		if (yield* directoryExists(target)) {
			yield* syncOpened(parent);
			return false;
		}
		if (!(yield* directoryExists(parent))) {
			yield* ensureDurableDirectory(parent);
		}
		const created = yield* createDirectoryEntry(target);
		yield* requireDirectory(target);
		yield* syncOpened(parent);
		return created;
	});
