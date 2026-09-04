import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { SeedFile } from "#test/support/inventory.ts";

const seeded: string[] = [];

const requiredLintInputs: readonly SeedFile[] = [
	{ content: "{}\n", path: "package.json" },
	{ content: "catalog:\n", path: "pnpm-workspace.yaml" },
	{
		content: "# Antumbra\n\n[Design](DESIGN.md)\n[Architecture](ARCHITECTURE.md)\n[Glossary](GLOSSARY.md)\n[Guides](docs/design/README.md)\n",
		path: "README.md",
	},
	{ content: "# Design axioms\n", path: "DESIGN.md" },
	{ content: "# Architecture\n", path: "ARCHITECTURE.md" },
	{
		content: "# Glossary\n\n## Work\n\nOwner: [Work](docs/design/work.md)\n\n- [**Voyage**](docs/design/work.md#voyage) — work under sail.\n",
		path: "GLOSSARY.md",
	},
	{
		content: "# Design guides\n\n- [Work](work.md)\n",
		path: "docs/design/README.md",
	},
	{ content: "# Work\n\n## Voyage\n", path: "docs/design/work.md" },
	{ content: "[]\n", path: "script/pragma-registry.json" },
];

export const seedTree = (...groups: ReadonlyArray<readonly SeedFile[]>): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-lint-"));
	seeded.push(root);
	for (const file of groups.flat()) {
		const full = join(root, file.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, file.content);
	}
	return root;
};

export const seedLintTree = (...groups: ReadonlyArray<readonly SeedFile[]>): string => seedTree(requiredLintInputs, ...groups);

export const removeSeededTrees = (): void => {
	for (const root of seeded.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
};
