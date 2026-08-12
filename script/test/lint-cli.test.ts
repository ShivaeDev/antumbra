import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import trees from "#test/fixtures/cli-trees.json" with { type: "json" };
import type { SeedFile } from "#test/support/inventory.ts";

const scriptDir = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(scriptDir, "lint.ts");
const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const seed = (files: readonly SeedFile[]): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-lint-"));
	roots.push(root);
	for (const file of files) {
		const full = join(root, file.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, file.content);
	}
	return root;
};

const runLint = (root: string) =>
	spawnSync("node", [entry, root], { encoding: "utf8" });

describe("lint entry point", () => {
	it("exits 0 and reports what it walked on a clean tree", () => {
		const result = runLint(seed(trees.clean));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("Lint passed");
	});

	it("merges every lint into one report and exits 1", () => {
		const result = runLint(seed(trees.dirty));
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

	// why: the lint system walks its own script/ tree, so this run is the
	// standing proof that the rules hold for the code that enforces them.
	it("passes when pointed at this repository", () => {
		const result = runLint(dirname(scriptDir));
		expect(result.stderr).toBe("");
		expect(result.status).toBe(0);
	});
});
