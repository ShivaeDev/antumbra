import { join } from "node:path";
import { Data, Effect, FileSystem } from "effect";
import type { PlatformError } from "effect/PlatformError";

const SKIPPED = new Set([".git", "dist", "node_modules", "out"]);

// why: a path that is simply not there is ordinary — zones are optional and
// files can vanish mid-walk. Every other failure (a permission wall, an
// unreadable device) would otherwise silence part of the tree and let the run
// report a clean pass over files nobody read.
const ABSENT = new Set(["ENOENT", "ENOTDIR"]);

export class FilesystemFailure extends Data.TaggedError("FilesystemFailure")<{
	readonly message: string;
	readonly path: string;
}> {}

// why: the platform layer normalizes ENOTDIR and EISDIR to one BadResource
// tag, which would collapse "a path component is a file" (ordinary) into
// "this file is a directory" (a real fault). The original errno rides along
// on the reason's cause, so the policy reads that rather than the tag.
const errnoOf = (error: PlatformError): string => {
	const cause: unknown = error.reason.cause;
	return typeof cause === "object" &&
		cause !== null &&
		"code" in cause &&
		typeof cause.code === "string"
		? cause.code
		: "";
};

const attempt = <Value>(
	path: string,
	action: Effect.Effect<Value, PlatformError, FileSystem.FileSystem>,
	whenAbsent: Value,
): Effect.Effect<Value, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.catchTag(action, "PlatformError", (error) =>
		ABSENT.has(errnoOf(error))
			? Effect.succeed(whenAbsent)
			: Effect.fail(
					new FilesystemFailure({
						message: `cannot read ${path}: ${error.message}`,
						path,
					}),
				),
	);

export const walk = (
	dir: string,
): Effect.Effect<readonly string[], FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const entries = yield* attempt<readonly string[]>(
			dir,
			fs.readDirectory(dir),
			[],
		);
		const nested = yield* Effect.forEach(
			entries.filter((entry) => !SKIPPED.has(entry)),
			(entry) => walkEntry(join(dir, entry)),
			{ concurrency: "unbounded" },
		);
		return nested.flat();
	});

const walkEntry = (
	path: string,
): Effect.Effect<readonly string[], FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const info = yield* attempt<FileSystem.File.Info | undefined>(
			path,
			fs.stat(path),
			undefined,
		);
		if (info === undefined) {
			return [];
		}
		if (info.type !== "Directory") {
			return [path];
		}
		return yield* walk(path);
	});

export const readText = (
	path: string,
): Effect.Effect<string, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* attempt(path, fs.readFileString(path), "");
	});
