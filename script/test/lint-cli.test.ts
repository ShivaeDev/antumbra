import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import trees from "#test/fixtures/cli-trees.json" with { type: "json" };
import { removeSeededTrees, seedTree } from "#test/support/tree.ts";

const scriptDir = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(scriptDir, "lint.ts");

afterEach(removeSeededTrees);

const runLint = (root: string) =>
	spawnSync("node", [entry, root], { encoding: "utf8" });

describe("lint entry point", () => {
	it("exits 0 and reports what it walked on a clean tree", () => {
		const result = runLint(seedTree(trees.clean));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Lint passed");
	});

	it("merges every lint into one report and exits 1", () => {
		const result = runLint(seedTree(trees.dirty));
		expect(result.status).toBe(1);
		for (const rule of [
			"structure/no-barrel",
			"patterns/no-console",
			"pragmas/unregistered",
			"manifests/catalog-only",
			"contracts/declaration-resolves",
		]) {
			expect(result.stderr).toContain(rule);
		}
		expect(result.stderr).toContain("violation(s).");
	});

	it("fails loudly when part of the tree cannot be read", () => {
		const root = seedTree(trees.clean);
		rmSync(join(root, "pnpm-workspace.yaml"));
		mkdirSync(join(root, "pnpm-workspace.yaml"));
		const result = runLint(root);
		expect(result.status).toBe(1);
		expect(result.stdout).not.toContain("Lint passed");
		expect(result.stderr).toContain("pnpm-workspace.yaml");
	});

	// why: the lint system walks its own script/ tree, so this run is the
	// standing proof that the rules hold for the code that enforces them.
	it("passes when pointed at this repository", () => {
		const result = runLint(dirname(scriptDir));
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
});
