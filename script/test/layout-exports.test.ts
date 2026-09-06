import { describe, expect, it } from "vitest";
import { layoutExportsViolations } from "#lint/rules/layout-exports.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const manifest = (root: string, exports: unknown) => ({
	path: `${root}/package.json`,
	raw: JSON.stringify({ exports, name: `@antumbra/${root.split("/").at(-1) ?? ""}` }),
});

const source = (path: string): SeedFile => ({ content: "export {};\n", path });

const check = (manifests: readonly ReturnType<typeof manifest>[], sources: readonly SeedFile[] = []) =>
	layoutExportsViolations(inventoryOf({ manifests, sources })).map(({ message, rule }) => ({ message, rule }));

describe("layout export rules", () => {
	it("accepts the one map a nested package may have", () => {
		expect(check([manifest("packages/platform/vocabulary", { "./*": "./src/*" })])).toEqual([]);
	});

	it("rejects a hand-kept subpath, an entry beside the wildcard, and a compiled target", () => {
		expect(check([manifest("packages/platform/vocabulary", { "./board": "./src/board.ts" })])[0]).toEqual({
			message:
				'@antumbra/vocabulary exports {"./board":"./src/board.ts"}: a nested package exports { "./*": "./src/*" } and an import names its file, extension and all.',
			rule: "layout/package-exports",
		});
		expect(check([manifest("packages/server/journal", { "./*": "./src/*", "./package.json": "./package.json" })])).toHaveLength(1);
		expect(check([manifest("packages/glass/renderer", { "./*": "./src/*.ts" })])).toHaveLength(1);
	});

	it("rejects a nested package with no exports map at all", () => {
		expect(check([manifest("packages/runner/git", undefined)])[0]?.rule).toBe("layout/package-exports");
	});

	it("rejects a barrel in a nested package", () => {
		expect(check([manifest("packages/platform/feature", { "./*": "./src/*" })], [source("packages/platform/feature/src/index.ts")])[0]).toEqual({
			message: '@antumbra/feature keeps a barrel: a nested package exports { "./*": "./src/*" } and an import names its file, extension and all.',
			rule: "layout/package-barrel",
		});
	});

	it("leaves the old flat packages and the applications alone", () => {
		expect(
			check(
				[
					manifest("packages/contract", { ".": "./src/index.ts", "./channels": "./src/channels.ts" }),
					manifest("apps/desktop", { ".": "./src/index.ts" }),
				],
				[source("packages/contract/src/index.ts"), source("apps/desktop/src/index.ts")],
			),
		).toEqual([]);
	});
});
