import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, expect } from "vitest";
import { collectInventory } from "#lint/inventory.ts";
import rawTree from "#test/fixtures/gitignore-tree.json" with { type: "json" };
import { decodeGitignoreTree } from "#test/support/fixture-schemas.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { removeSeededTrees, seedLintTree } from "#test/support/tree.ts";

afterEach(removeSeededTrees);

const pathsOf = (root: string) => Effect.map(collectInventory(root), (inventory) => inventory.sources.map((source) => source.path));

const sourceFiles = (paths: readonly string[]): readonly SeedFile[] => paths.map((path) => ({ content: "export const value = 1;\n", path }));
const tree = decodeGitignoreTree(rawTree);
const ignored = sourceFiles(tree.ignoredPaths);
const kept = sourceFiles(tree.keptPaths);

// Expected paths were captured from git check-ignore against the same fixture.
it.layer(NodeFileSystem.layer)("gitignore-aware walk", (it) => {
	it.effect("keeps gitignored files out of the inventory", () =>
		Effect.gen(function* () {
			const root = seedLintTree(tree.gitignores, ignored, kept);
			const paths = yield* pathsOf(root);
			for (const path of tree.ignoredPaths) {
				expect(paths).not.toContain(path);
			}
			for (const path of tree.keptPaths) {
				expect(paths).toContain(path);
			}
		}),
	);

	it.effect("walks the identical tree in full when nothing is ignored", () =>
		Effect.gen(function* () {
			const root = seedLintTree(sourceFiles(tree.ignoredPaths), kept);
			const paths = yield* pathsOf(root);
			for (const path of [...tree.ignoredPaths, ...tree.keptPaths]) {
				expect(paths).toContain(path);
			}
		}),
	);

	it.effect("scopes an outer directory rule to the re-included subtree", () =>
		Effect.gen(function* () {
			const root = seedLintTree(tree.gitignores, ignored, kept);
			const paths = yield* pathsOf(root);
			expect(paths).toContain("packages/z/build/sub/deep.ts");
			expect(paths).not.toContain("packages/z/build/a.scratch.ts");
		}),
	);

	it.effect("prunes vendored directories with no .gitignore present", () =>
		Effect.gen(function* () {
			const root = seedLintTree([
				{ content: "export const k = 1;\n", path: "packages/x/src/mod.ts" },
				{
					content: "export const v = 1;\n",
					path: "packages/x/node_modules/v/index.ts",
				},
			]);
			expect(yield* pathsOf(root)).toEqual(["packages/x/src/mod.ts"]);
		}),
	);
});
