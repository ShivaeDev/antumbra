import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// runner-local shells out to Git worktrees and must not share the package pool.
const isolatedPackageNames = new Set(["runner-local"]);

// Package-level Vitest runs discover a root vitest.config.ts and would execute every project.
export const workspacePackageNames: readonly string[] = readdirSync(join(repoRoot, "packages"), { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && !isolatedPackageNames.has(entry.name))
	.map((entry) => entry.name)
	.toSorted();

export default defineConfig({
	test: {
		projects: workspacePackageNames.map((name) => ({
			root: join(repoRoot, "packages", name),
			test: {
				include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
				name,
			},
		})),
	},
});
