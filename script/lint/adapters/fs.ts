import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Data, Effect } from "effect";

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

class AbsentPath extends Data.TaggedError("AbsentPath")<{
	readonly path: string;
}> {}

const codeOf = (cause: unknown): string =>
	typeof cause === "object" &&
	cause !== null &&
	"code" in cause &&
	typeof cause.code === "string"
		? cause.code
		: "";

const attempt = <Value>(
	path: string,
	action: () => Value,
	whenAbsent: Value,
): Effect.Effect<Value, FilesystemFailure> =>
	Effect.catchTag(
		Effect.try({
			catch: (cause) =>
				ABSENT.has(codeOf(cause))
					? new AbsentPath({ path })
					: new FilesystemFailure({
							message: `cannot read ${path}: ${String(cause)}`,
							path,
						}),
			try: action,
		}),
		"AbsentPath",
		() => Effect.succeed(whenAbsent),
	);

export const walk = (
	dir: string,
): Effect.Effect<readonly string[], FilesystemFailure> =>
	Effect.flatMap(
		attempt<readonly string[]>(dir, () => readdirSync(dir), []),
		(entries) =>
			Effect.map(
				Effect.forEach(
					entries.filter((entry) => !SKIPPED.has(entry)),
					(entry) => walkEntry(join(dir, entry)),
				),
				(nested) => nested.flat(),
			),
	);

const walkEntry = (
	path: string,
): Effect.Effect<readonly string[], FilesystemFailure> =>
	Effect.flatMap(
		attempt<boolean | undefined>(
			path,
			() => statSync(path).isDirectory(),
			undefined,
		),
		(directory) => {
			if (directory === undefined) {
				return Effect.succeed([]);
			}
			return directory ? walk(path) : Effect.succeed([path]);
		},
	);

export const readText = (
	path: string,
): Effect.Effect<string, FilesystemFailure> =>
	attempt(path, () => readFileSync(path, "utf8"), "");
