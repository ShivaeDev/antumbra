import { describe, expect, it } from "vitest";
import { layoutExportsViolations } from "#lint/rules/layout-exports.ts";
import { inventoryOf, seededPackageName } from "#test/support/inventory.ts";

const manifest = (root: string, exports: unknown) => ({
	path: `${root}/package.json`,
	raw: JSON.stringify({ exports, name: seededPackageName(root) }),
});

const check = (manifests: readonly ReturnType<typeof manifest>[]) =>
	layoutExportsViolations(inventoryOf({ manifests })).map(({ message, rule }) => ({ message, rule }));

describe("layout export rules", () => {
	it("accepts the one map a nested package may have", () => {
		expect(check([manifest("packages/platform/vocabulary", { "./*": "./src/*" })])).toEqual([]);
	});

	it("rejects a hand-kept subpath, an entry beside the wildcard, and a compiled target", () => {
		expect(check([manifest("packages/platform/vocabulary", { "./board": "./src/board.ts" })])[0]).toEqual({
			message:
				'@antumbra/platform-vocabulary exports {"./board":"./src/board.ts"}: a nested package exports { "./*": "./src/*" } and an import names its file, extension and all.',
			rule: "layout/package-exports",
		});
		expect(check([manifest("packages/server/journal", { "./*": "./src/*", "./package.json": "./package.json" })])).toHaveLength(1);
		expect(check([manifest("packages/glass/renderer", { "./*": "./src/*.ts" })])).toHaveLength(1);
	});

	it("rejects a nested package with no exports map at all", () => {
		expect(check([manifest("packages/runner/git", undefined)])[0]?.rule).toBe("layout/package-exports");
	});

	it("leaves the applications alone", () => {
		expect(check([manifest("apps/desktop", { ".": "./src/index.ts" })])).toEqual([]);
	});
});
