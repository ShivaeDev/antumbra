import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SeedFile } from "#test/support/inventory.ts";

const seeded: string[] = [];

const requiredLintInputs: readonly SeedFile[] = [
	{ content: "{}\n", path: "package.json" },
	{ content: "catalog:\n", path: "pnpm-workspace.yaml" },
	{ content: "[]\n", path: "script/pragma-registry.json" },
	{
		content: "[]\n",
		path: "script/lint/service-parameter-allowance.json",
	},
	{
		content: "[]\n",
		path: "script/lint/service-parameter-baseline.json",
	},
];

export const seedTree = (
	...groups: ReadonlyArray<readonly SeedFile[]>
): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-lint-"));
	seeded.push(root);
	for (const file of groups.flat()) {
		const full = join(root, file.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, file.content);
	}
	return root;
};

export const seedLintTree = (
	...groups: ReadonlyArray<readonly SeedFile[]>
): string => seedTree(requiredLintInputs, ...groups);

export const removeSeededTrees = (): void => {
	for (const root of seeded.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
};
