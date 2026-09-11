import { describe, expect, it } from "vitest";
import { layoutViolations } from "#lint/rules/layout.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const present = (root: string): SeedFile => ({ content: "export {};\n", path: `${root}/src/index.ts` });

const importing = (root: string, specifier: string): SeedFile => ({
	content: `import "${specifier}";\nexport {};\n`,
	path: `${root}/src/use.ts`,
});

const check = (edge: SeedFile, ...others: readonly string[]) =>
	layoutViolations(inventoryOf({ sources: [edge, ...others.map(present)] })).map(({ message }) => message);

describe("layout rules", () => {
	it("holds a platform package to platform", () => {
		expect(check(importing("packages/platform/vocabulary", "@antumbra/kernel"), "packages/kernel")).toEqual([
			"@antumbra/vocabulary may not import @antumbra/kernel: platform packages import platform.",
		]);
		expect(check(importing("packages/platform/vocabulary", "@antumbra/prompts"), "packages/platform/prompts")).toEqual([]);
	});

	it("lets a package import its own subpaths", () => {
		expect(check(importing("packages/platform/vocabulary", "@antumbra/vocabulary/board"))).toEqual([]);
	});

	it("passes a domain's files to the glass and nothing else of the server", () => {
		expect(check(importing("packages/glass/settings", "@antumbra/pieces/feature.ts"), "packages/server/domains/pieces")).toEqual([]);
		expect(check(importing("packages/glass/settings", "@antumbra/pieces/rows/piece.ts"), "packages/server/domains/pieces")).toEqual([]);
		expect(check(importing("packages/glass/settings", "@antumbra/journal"), "packages/server/journal")).toEqual([
			"@antumbra/settings may not import @antumbra/journal: glass packages import platform, glass, and a server domain's files.",
		]);
	});

	it("keeps the journal to the domains", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/journal"), "packages/server/journal")).toEqual([]);
		expect(check(importing("packages/server/edges/github", "@antumbra/journal"), "packages/server/journal")).toEqual([
			"@antumbra/github may not import @antumbra/journal: server edge packages import platform.",
		]);
		expect(check(importing("packages/server/journal", "@antumbra/pieces"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/journal may not import @antumbra/pieces: server journal packages import platform.",
		]);
	});

	it("keeps a backend on the runner's ports", () => {
		expect(check(importing("packages/runner/backends/claude", "@antumbra/ports"), "packages/runner/ports")).toEqual([]);
		expect(check(importing("packages/runner/backends/claude", "@antumbra/fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/claude may not import @antumbra/fabric: runner backend packages import platform and the runner's ports.",
		]);
	});

	it("keeps git on platform", () => {
		expect(check(importing("packages/runner/git", "@antumbra/vocabulary"), "packages/platform/vocabulary")).toEqual([]);
		expect(check(importing("packages/runner/git", "@antumbra/fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/git may not import @antumbra/fabric: runner git packages import platform.",
		]);
	});

	it("holds an old package to old packages and platform", () => {
		expect(check(importing("packages/domain", "@antumbra/kernel"), "packages/kernel")).toEqual([]);
		expect(check(importing("packages/domain", "@antumbra/vocabulary"), "packages/platform/vocabulary")).toEqual([]);
		expect(check(importing("packages/domain", "@antumbra/pieces/feature.ts"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/domain may not import @antumbra/pieces/feature.ts: old packages import old and platform.",
		]);
	});

	it("keeps old code out of the nested groups", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/kernel"), "packages/kernel")).toEqual([
			"@antumbra/pieces may not import @antumbra/kernel: server packages import platform and server.",
		]);
	});

	it("lets the old renderer reach the glass it mounts", () => {
		expect(check(importing("packages/renderer", "@antumbra/glass-role-settings"), "packages/glass/glass-role-settings")).toEqual([]);
		expect(check(importing("packages/renderer", "@antumbra/glass-settings"), "packages/glass/glass-settings")).toEqual([]);
		expect(check(importing("packages/renderer", "@antumbra/glass-client"), "packages/glass/glass-client")).toEqual([
			"@antumbra/renderer may not import @antumbra/glass-client: old packages import old and platform.",
		]);
	});

	it("lets an app import anything", () => {
		expect(check(importing("apps/desktop", "@antumbra/pieces"), "packages/server/domains/pieces")).toEqual([]);
	});
});
