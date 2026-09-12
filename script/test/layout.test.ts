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
		expect(check(importing("packages/platform/vocabulary", "@antumbra/glass-boards"), "packages/glass/boards")).toEqual([
			"@antumbra/platform-vocabulary may not import @antumbra/glass-boards: platform packages import platform.",
		]);
		expect(check(importing("packages/platform/vocabulary", "@antumbra/platform-prompts"), "packages/platform/prompts")).toEqual([]);
	});

	it("lets a package import its own subpaths", () => {
		expect(check(importing("packages/platform/vocabulary", "@antumbra/platform-vocabulary/board"))).toEqual([]);
	});

	it("passes a domain's files to the glass and nothing else of the server", () => {
		expect(check(importing("packages/glass/settings", "@antumbra/domain-pieces/feature.ts"), "packages/server/domains/pieces")).toEqual([]);
		expect(check(importing("packages/glass/settings", "@antumbra/domain-pieces/rows/piece.ts"), "packages/server/domains/pieces")).toEqual([]);
		expect(check(importing("packages/glass/settings", "@antumbra/server-journal"), "packages/server/journal")).toEqual([
			"@antumbra/glass-settings may not import @antumbra/server-journal: glass packages import platform, glass, and a server domain's files.",
		]);
	});

	it("keeps the journal to the domains", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/server-journal"), "packages/server/journal")).toEqual([]);
		expect(check(importing("packages/server/edges/github", "@antumbra/server-journal"), "packages/server/journal")).toEqual([
			"@antumbra/edge-github may not import @antumbra/server-journal: server edge packages import platform.",
		]);
		expect(check(importing("packages/server/journal", "@antumbra/domain-pieces"), "packages/server/domains/pieces")).toEqual([
			"@antumbra/server-journal may not import @antumbra/domain-pieces: server journal packages import platform.",
		]);
	});

	it("keeps a backend on the runner's ports", () => {
		expect(check(importing("packages/runner/backends/claude", "@antumbra/runner-ports"), "packages/runner/ports")).toEqual([]);
		expect(check(importing("packages/runner/backends/claude", "@antumbra/runner-fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/backend-claude may not import @antumbra/runner-fabric: runner backend packages import platform and the runner's ports.",
		]);
	});

	it("keeps git on platform", () => {
		expect(check(importing("packages/runner/git", "@antumbra/platform-vocabulary"), "packages/platform/vocabulary")).toEqual([]);
		expect(check(importing("packages/runner/git", "@antumbra/runner-fabric"), "packages/runner/fabric")).toEqual([
			"@antumbra/runner-git may not import @antumbra/runner-fabric: runner git packages import platform.",
		]);
	});

	it("keeps a server package out of the glass", () => {
		expect(check(importing("packages/server/domains/pieces", "@antumbra/glass-boards"), "packages/glass/boards")).toEqual([
			"@antumbra/domain-pieces may not import @antumbra/glass-boards: server packages import platform and server.",
		]);
	});

	it("lets an app import anything", () => {
		expect(check(importing("apps/desktop", "@antumbra/domain-pieces"), "packages/server/domains/pieces")).toEqual([]);
	});
	it("allows app-testing only from package tests", () => {
		const root = "packages/glass/settings";
		const specifier = "@antumbra/app-testing/glass/entry.tsx";
		const source = importing(root, specifier);
		const inspect = (path: string) =>
			layoutViolations(
				inventoryOf({
					sources: [{ ...source, path }],
					manifests: [
						{ path: `${root}/package.json`, raw: JSON.stringify({ name: "@antumbra/glass-settings" }) },
						{ path: "apps/testing/package.json", raw: JSON.stringify({ name: "@antumbra/app-testing" }) },
					],
				}),
			);
		expect(inspect(`${root}/test/screens.test.tsx`)).toEqual([]);
		expect(inspect(source.path)).toHaveLength(1);
		expect(check({ ...importing(root, "@antumbra/server/application.ts"), path: `${root}/test/screens.test.tsx` }, "apps/server")).toHaveLength(1);
	});

	it("allows domain contracts in journal tests", () => {
		const source = importing("packages/server/journal", "@antumbra/domain-settings/queries/counts.ts");
		expect(check({ ...source, path: "packages/server/journal/test/live.test.ts" }, "packages/server/domains/settings")).toEqual([]);
		expect(check(source, "packages/server/domains/settings")).toHaveLength(1);
	});
});
