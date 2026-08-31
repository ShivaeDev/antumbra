import { join } from "node:path";
import { Data, Effect, FileSystem } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { emptyScope, type IgnoreScope, insideKept, verdictFor, withGitignore } from "#lint/adapters/gitignore.ts";

const SKIPPED = new Set([".git", "dist", "node_modules", "out"]);

const ABSENT = new Set(["ENOENT", "ENOTDIR"]);

export class FilesystemFailure extends Data.TaggedError("FilesystemFailure")<{
	readonly message: string;
	readonly path: string;
}> {}

// Effect maps ENOTDIR and EISDIR to BadResource; the original errno remains on the cause.
const errnoOf = (error: PlatformError): string => {
	const cause: unknown = error.reason.cause;
	return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : "";
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

export const readOptionalText = (path: string): Effect.Effect<string, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* attempt(path, fs.readFileString(path), "");
	});

export const readRequiredText = (path: string): Effect.Effect<string, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		return yield* Effect.mapError(
			fs.readFileString(path),
			(error) =>
				new FilesystemFailure({
					message: ABSENT.has(errnoOf(error)) ? `required input is missing: ${path}` : `cannot read ${path}: ${error.message}`,
					path,
				}),
		);
	});

export const ignoreScopeAt = (
	dir: string,
	inherited: IgnoreScope = emptyScope,
): Effect.Effect<IgnoreScope, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.map(readOptionalText(join(dir, ".gitignore")), (contents) => (contents === "" ? inherited : withGitignore(inherited, dir, contents)));

export const walk = (dir: string, inherited: IgnoreScope = emptyScope): Effect.Effect<readonly string[], FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const scope = yield* ignoreScopeAt(dir, inherited);
		const entries = yield* attempt<readonly string[]>(dir, fs.readDirectory(dir), []);
		const nested = yield* Effect.forEach(
			entries.filter((entry) => !SKIPPED.has(entry)),
			(entry) => walkEntry(join(dir, entry), scope),
			{ concurrency: 1 },
		);
		return nested.flat();
	});

const walkEntry = (path: string, scope: IgnoreScope): Effect.Effect<readonly string[], FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const info = yield* attempt<FileSystem.File.Info | undefined>(path, fs.stat(path), undefined);
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
		return yield* walk(path, verdict === "kept" ? insideKept(scope, path) : scope);
	});
