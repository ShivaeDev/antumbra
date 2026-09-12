import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { afterEach, expect } from "vitest";
import { collectInventory } from "#lint/inventory.ts";
import { removeSeededTrees, seedLintTree } from "#test/support/tree.ts";

afterEach(removeSeededTrees);

it.layer(NodeFileSystem.layer)("source inventory", (it) => {
	it.effect("leaves generated migrations out and keeps the sources beside them", () =>
		Effect.gen(function* () {
			const root = seedLintTree([
				{ content: "export const migration = 1;\n", path: "packages/persistence/migrations/app/20260101T0000_move/migration.ts" },
				{ content: "export const store = 1;\n", path: "packages/persistence/src/database.ts" },
			]);
			const paths = (yield* collectInventory(root)).sources.map((source) => source.path);
			expect(paths).not.toContain("packages/persistence/migrations/app/20260101T0000_move/migration.ts");
			expect(paths).toContain("packages/persistence/src/database.ts");
		}),
	);
});
