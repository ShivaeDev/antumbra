import { join } from "node:path";
import { Data, Effect, FileSystem } from "effect";
import type { PlatformError } from "effect/PlatformError";
import {
	emptyScope,
	type IgnoreScope,
	insideKept,
	verdictFor,
	withGitignore,
} from "#lint/adapters/gitignore.ts";

// why: a floor rather than the policy — these stay pruned in a tree that has
// no .gitignore at all, so the walk never wanders into a dependency tree or
// build output just because nobody wrote the rule down.
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

export const readOptionalText = (
	path: string,
): Effect.Effect<string, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* attempt(path, fs.readFileString(path), "");
	});

export const readRequiredText = (
	path: string,
): Effect.Effect<string, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* Effect.mapError(
			fs.readFileString(path),
			(error) =>
				new FilesystemFailure({
					message: ABSENT.has(errnoOf(error))
						? `required input is missing: ${path}`
						: `cannot read ${path}: ${error.message}`,
					path,
				}),
		);
	});

export const ignoreScopeAt = (
	dir: string,
	inherited: IgnoreScope = emptyScope,
): Effect.Effect<IgnoreScope, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.map(readOptionalText(join(dir, ".gitignore")), (contents) =>
		contents === "" ? inherited : withGitignore(inherited, dir, contents),
	);

export const walk = (
	dir: string,
	inherited: IgnoreScope = emptyScope,
): Effect.Effect<readonly string[], FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const scope = yield* ignoreScopeAt(dir, inherited);
		const entries = yield* attempt<readonly string[]>(
			dir,
			fs.readDirectory(dir),
			[],
		);
		const nested = yield* Effect.forEach(
			entries.filter((entry) => !SKIPPED.has(entry)),
			(entry) => walkEntry(join(dir, entry), scope),
			{ concurrency: 1 },
		);
		return nested.flat();
	});

const walkEntry = (
	path: string,
	scope: IgnoreScope,
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
		const directory = info.type === "Directory";
		const verdict = verdictFor(scope, path, directory);
		if (verdict === "ignored") {
			return [];
		}
		if (!directory) {
			return [path];
		}
		return yield* walk(
			path,
			verdict === "kept" ? insideKept(scope, path) : scope,
		);
	});
