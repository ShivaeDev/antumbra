import { join, relative } from "node:path";
import { Effect, type FileSystem } from "effect";
import { type FilesystemFailure, readText, walk } from "#lint/adapters/fs.ts";

export interface SourceFile {
	readonly lines: readonly string[];
	readonly path: string;
}

export interface TextFile {
	readonly path: string;
	readonly raw: string;
}

export interface Inventory {
	readonly manifests: readonly TextFile[];
	readonly pragmaRegistry: string;
	readonly root: string;
	readonly sources: readonly SourceFile[];
	readonly workspaceCatalog: string;
}

const WALKED_ZONES = ["apps", "packages", "script"];
const SOURCE_PATH = /\.tsx?$/;
const WORKSPACE_MANIFEST = /^(apps|packages)\/[^/]+\/package\.json$/;

export const basename = (path: string): string => path.split("/").pop() ?? "";

export const isDeclaration = (path: string): boolean => path.endsWith(".d.ts");

const posix = (path: string): string => path.replaceAll("\\", "/");

export const collectInventory = (
	root: string,
): Effect.Effect<Inventory, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const zones = yield* Effect.all(
			WALKED_ZONES.map((zone) => walk(join(root, zone))),
			{ concurrency: "unbounded" },
		);
		const entries = zones
			.flat()
			.map((absolute) => ({ absolute, path: posix(relative(root, absolute)) }));
		const sources = yield* Effect.all(
			entries
				.filter((entry) => SOURCE_PATH.test(entry.path))
				.map((entry) =>
					Effect.map(readText(entry.absolute), (raw) => ({
						lines: raw.split("\n"),
						path: entry.path,
					})),
				),
			{ concurrency: "unbounded" },
		);
		const manifests = yield* Effect.all(
			[
				{ absolute: join(root, "package.json"), path: "package.json" },
				...entries.filter((entry) => WORKSPACE_MANIFEST.test(entry.path)),
			].map((entry) =>
				Effect.map(readText(entry.absolute), (raw) => ({
					path: entry.path,
					raw,
				})),
			),
			{ concurrency: "unbounded" },
		);
		const workspaceCatalog = yield* readText(join(root, "pnpm-workspace.yaml"));
		const pragmaRegistry = yield* readText(
			join(root, "script", "pragma-registry.json"),
		);
		return {
			manifests: manifests.filter((manifest) => manifest.raw !== ""),
			pragmaRegistry,
			root,
			sources,
			workspaceCatalog,
		};
	});
