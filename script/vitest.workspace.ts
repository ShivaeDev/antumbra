import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// why: these packages shell out to git worktrees and starve in the shared
// pool. Desktop lives under apps/ and is excluded by reading packages/ only.
const isolatedPackageNames = new Set(["runner-local"]);

// why: a root vitest.config.ts would be picked up by package-level
// `vitest run` via directory walk and execute every project.
export const workspacePackageNames: readonly string[] = readdirSync(
	join(repoRoot, "packages"),
	{ withFileTypes: true },
)
	.filter(
		(entry) => entry.isDirectory() && !isolatedPackageNames.has(entry.name),
	)
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
