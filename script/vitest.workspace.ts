import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const NEST = "packages/";

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
export const workspacePackages: readonly WorkspacePackage[] = packageDirectories(join(repoRoot, NEST))
	.map((absolute) => {
		const path = relative(repoRoot, absolute).split(sep).join("/");
		return { name: path.slice(NEST.length), path };
	})
	.toSorted((left, right) => left.name.localeCompare(right.name));

export const workspacePackageNames: readonly string[] = workspacePackages.map(({ name }) => name);

export default defineConfig({
	test: {
		projects: workspacePackages.map(({ name, path }) => {
			const own = join(repoRoot, path, "vitest.config.ts");
			let config = existsSync(own) ? own : undefined;
			if (config === undefined && name.startsWith("glass/")) {
				config = join(repoRoot, "apps/testing/src/glass/config.ts");
			}
			return {
				root: join(repoRoot, path),
				...(config === undefined ? {} : { extends: config }),
				test: {
					include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
					name,
				},
			};
		}),
	},
});
