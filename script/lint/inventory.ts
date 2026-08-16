import { join, relative } from "node:path";
import { Effect, type FileSystem } from "effect";
import {
	type FilesystemFailure,
	ignoreScopeAt,
	readRequiredText,
	walk,
} from "#lint/adapters/fs.ts";
import {
	type SourceComment,
	sourceComments,
} from "#lint/adapters/typescript.ts";

export interface SourceFile {
	readonly comments: readonly SourceComment[];
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
	readonly serviceParameterAllowance: string;
	readonly serviceParameterBaseline: string;
	readonly sources: readonly SourceFile[];
	readonly workspaceCatalog: string;
}

const WALKED_ZONES = ["apps", "packages", "script"];
const SOURCE_PATH = /\.tsx?$/;
const WORKSPACE_MANIFEST = /^(apps|packages)\/[^/]+\/package\.json$/;
const INVENTORY_CONCURRENCY = 16;

export const basename = (path: string): string => path.split("/").pop() ?? "";

export const isDeclaration = (path: string): boolean => path.endsWith(".d.ts");

const posix = (path: string): string => path.replaceAll("\\", "/");

export const collectInventory = (
	root: string,
): Effect.Effect<Inventory, FilesystemFailure, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const ignores = yield* ignoreScopeAt(root);
		const zones = yield* Effect.all(
			WALKED_ZONES.map((zone) => walk(join(root, zone), ignores)),
			{ concurrency: INVENTORY_CONCURRENCY },
		);
		const entries = zones
			.flat()
			.map((absolute) => ({ absolute, path: posix(relative(root, absolute)) }));
		const sources = yield* Effect.all(
			entries
				.filter((entry) => SOURCE_PATH.test(entry.path))
				.map((entry) =>
					Effect.map(readRequiredText(entry.absolute), (raw) => ({
						comments: sourceComments(entry.path, raw),
						lines: raw.split("\n"),
						path: entry.path,
					})),
				),
			{ concurrency: INVENTORY_CONCURRENCY },
		);
		const manifests = yield* Effect.all(
			[
				{ absolute: join(root, "package.json"), path: "package.json" },
				...entries.filter((entry) => WORKSPACE_MANIFEST.test(entry.path)),
			].map((entry) =>
				Effect.map(readRequiredText(entry.absolute), (raw) => ({
					path: entry.path,
					raw,
				})),
			),
			{ concurrency: INVENTORY_CONCURRENCY },
		);
		const workspaceCatalog = yield* readRequiredText(
			join(root, "pnpm-workspace.yaml"),
		);
		const pragmaRegistry = yield* readRequiredText(
			join(root, "script", "pragma-registry.json"),
		);
		const serviceParameterBaseline = yield* readRequiredText(
			join(root, "script", "lint", "service-parameter-baseline.json"),
		);
		const serviceParameterAllowance = yield* readRequiredText(
			join(root, "script", "lint", "service-parameter-allowance.json"),
		);
		return {
			manifests,
			pragmaRegistry,
			root,
			serviceParameterAllowance,
			serviceParameterBaseline,
			sources,
			workspaceCatalog,
		};
	});
