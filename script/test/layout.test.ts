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

	it("passes a feature's contract entry between process groups and nothing else of it", () => {
		expect(check(importing("packages/glass/renderer", "@antumbra/pieces/contract"), "packages/server/domains/pieces")).toEqual([]);
		expect(check(importing("packages/glass/renderer", "@antumbra/pieces"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/renderer may not import @antumbra/pieces: glass packages import platform, glass, and another group's contract entry.",
		]);
	});

	it("keeps the journal to the domains", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/journal"), "packages/server/journal")).toEqual([]);
		expect(check(importing("packages/server/edges/github", "@antumbra/journal"), "packages/server/journal")).toEqual([
			"@antumbra/github may not import @antumbra/journal: server edge packages import platform and another group's contract entry.",
		]);
		expect(check(importing("packages/server/journal", "@antumbra/pieces"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/journal may not import @antumbra/pieces: server journal packages import platform and another group's contract entry.",
		]);
	});

	it("keeps a backend on the runner's ports", () => {
		expect(check(importing("packages/runner/backends/claude", "@antumbra/ports"), "packages/runner/ports")).toEqual([]);
		expect(check(importing("packages/runner/backends/claude", "@antumbra/fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/claude may not import @antumbra/fabric: runner backend packages import platform, the runner's ports, and another group's contract entry.",
		]);
	});

	it("keeps git on platform", () => {
		expect(check(importing("packages/runner/git", "@antumbra/vocabulary"), "packages/platform/vocabulary")).toEqual([]);
		expect(check(importing("packages/runner/git", "@antumbra/fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/git may not import @antumbra/fabric: runner git packages import platform and another group's contract entry.",
		]);
	});

	it("holds an old package to old packages and platform", () => {
		expect(check(importing("packages/domain", "@antumbra/kernel"), "packages/kernel")).toEqual([]);
		expect(check(importing("packages/domain", "@antumbra/vocabulary"), "packages/platform/vocabulary")).toEqual([]);
		expect(check(importing("packages/domain", "@antumbra/pieces/contract"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/domain may not import @antumbra/pieces/contract: old packages import old and platform.",
		]);
	});

	it("keeps old code out of the nested groups", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/kernel"), "packages/kernel")).toEqual([
			"@antumbra/pieces may not import @antumbra/kernel: server packages import platform, server, and another group's contract entry.",
		]);
	});

	it("lets an app import anything", () => {
		expect(check(importing("apps/desktop", "@antumbra/pieces"), "packages/server/domains/pieces")).toEqual([]);
	});
});
