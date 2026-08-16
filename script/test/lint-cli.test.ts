import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import rawTrees from "#test/fixtures/cli-trees.json" with { type: "json" };
import { decodeLintTrees } from "#test/support/fixture-schemas.ts";
import { removeSeededTrees, seedLintTree } from "#test/support/tree.ts";

const scriptDir = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(scriptDir, "lint.ts");
const trees = decodeLintTrees(rawTrees);

afterEach(removeSeededTrees);

const runLint = (root: string) =>
	spawnSync("node", [entry, root], { encoding: "utf8" });

describe("lint entry point", () => {
	it("exits 0 and reports what it walked on a clean tree", () => {
		const result = runLint(seedLintTree(trees.clean));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Lint passed");
	});

	it("merges every lint into one report and exits 1", () => {
		const result = runLint(seedLintTree(trees.dirty));
		expect(result.status).toBe(1);
		for (const rule of [
			"structure/no-barrel",
			"pragmas/unregistered",
			"manifests/catalog-only",
			"contracts/declaration-resolves",
		]) {
			expect(result.stderr).toContain(rule);
		}
		expect(result.stderr).toContain("violation(s).");
		expect(result.stderr).not.toContain("LintFailed");
	});

	it("fails loudly when part of the tree cannot be read", () => {
		const root = seedLintTree(trees.clean);
		rmSync(join(root, "pnpm-workspace.yaml"));
		mkdirSync(join(root, "pnpm-workspace.yaml"));
		const result = runLint(root);
		expect(result.status).toBe(1);
		expect(result.stdout).not.toContain("Lint passed");
		expect(result.stderr).toContain("pnpm-workspace.yaml");
	});

	it("fails when a required lint input is missing", () => {
		const root = seedLintTree(trees.clean);
		rmSync(join(root, "package.json"));
		const result = runLint(root);
		expect(result.status).toBe(1);
		expect(result.stdout).not.toContain("Lint passed");
		expect(result.stderr).toContain("required input is missing");
		expect(result.stderr).toContain("package.json");
	});

	// why: the lint system walks its own script/ tree, so this run is the
	// standing proof that the rules hold for the code that enforces them.
	it("passes when pointed at this repository", () => {
		const result = runLint(dirname(scriptDir));
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
});
