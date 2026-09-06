import { existsSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// runner-local shells out to Git worktrees and must not share the package pool.
const isolatedPackageNames = new Set(["runner-local"]);

export interface WorkspacePackage {
	readonly name: string;
	readonly path: string;
}

const packageDirectories = (directory: string): readonly string[] =>
	existsSync(join(directory, "package.json"))
		? [directory]
		: readdirSync(directory, { withFileTypes: true })
				.filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
				.flatMap((entry) => packageDirectories(join(directory, entry.name)));

// Package-level Vitest runs discover a root vitest.config.ts and would execute every project.
export const workspacePackages: readonly WorkspacePackage[] = packageDirectories(join(repoRoot, "packages"))
	.map((absolute) => ({
		name: basename(absolute),
		path: relative(repoRoot, absolute).split(sep).join("/"),
	}))
	.filter(({ name }) => !isolatedPackageNames.has(name))
	.toSorted((left, right) => left.name.localeCompare(right.name));

export const workspacePackageNames: readonly string[] = workspacePackages.map(({ name }) => name);

export default defineConfig({
	test: {
		projects: workspacePackages.map(({ name, path }) => ({
			root: join(repoRoot, path),
			...(name === "renderer" ? { extends: join(repoRoot, path, "vitest.config.ts") } : {}),
			test: {
				include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
				name,
			},
		})),
	},
});
