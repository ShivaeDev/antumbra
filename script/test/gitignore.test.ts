import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, expect } from "vitest";
import { collectInventory } from "#lint/inventory.ts";
import { lint } from "#lint/program.ts";
import tree from "#test/fixtures/gitignore-tree.json" with { type: "json" };
import { removeSeededTrees, seedTree } from "#test/support/tree.ts";

afterEach(removeSeededTrees);

const pathsOf = (root: string) =>
	Effect.map(collectInventory(root), (inventory) =>
		inventory.sources.map((source) => source.path),
	);

const ignoredPaths = tree.ignored.map((file) => file.path);
const keptPaths = tree.kept.map((file) => file.path);

// why: every expectation here was taken from `git check-ignore` on the same
// tree, so the walk stays answerable to git rather than to the matcher.
it.layer(NodeFileSystem.layer)("gitignore-aware walk", (it) => {
	it.effect("keeps gitignored files out of the inventory", () =>
		Effect.gen(function* () {
			const root = seedTree(tree.gitignores, tree.ignored, tree.kept);
			const paths = yield* pathsOf(root);
			for (const path of ignoredPaths) {
				expect(paths).not.toContain(path);
			}
			for (const path of keptPaths) {
				expect(paths).toContain(path);
			}
		}),
	);

	it.effect("reports no violation from a gitignored file", () =>
		Effect.gen(function* () {
			const root = seedTree(tree.gitignores, tree.ignored, tree.kept);
			const inventory = yield* collectInventory(root);
			expect(yield* lint(inventory)).toEqual([]);
		}),
	);

	// why: the same tree without its .gitignore files must still see every
	// violation, which is what proves the ignore rules did the suppressing.
	it.effect("walks the identical tree in full when nothing is ignored", () =>
		Effect.gen(function* () {
			const root = seedTree(tree.ignored, tree.kept);
			const paths = yield* pathsOf(root);
			for (const path of [...ignoredPaths, ...keptPaths]) {
				expect(paths).toContain(path);
			}
			const inventory = yield* collectInventory(root);
			const violations = yield* lint(inventory);
			expect(violations).toHaveLength(ignoredPaths.length);
		}),
	);

	// why: re-including a directory settles it for the whole subtree, but an
	// outer pattern that matches a file on its own name keeps applying inside
	// it. Both halves live in the fixture, so name them here.
	it.effect("scopes an outer directory rule to the re-included subtree", () =>
		Effect.gen(function* () {
			const root = seedTree(tree.gitignores, tree.ignored, tree.kept);
			const paths = yield* pathsOf(root);
			expect(paths).toContain("packages/z/build/sub/deep.ts");
			expect(paths).not.toContain("packages/z/build/a.scratch.ts");
		}),
	);

	it.effect("prunes vendored directories with no .gitignore present", () =>
		Effect.gen(function* () {
			const root = seedTree([
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
