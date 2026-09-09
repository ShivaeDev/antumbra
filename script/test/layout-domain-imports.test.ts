import { describe, expect, it } from "vitest";
import { layoutDomainImportViolations } from "#lint/rules/layout-domain-imports.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const present = (root: string): SeedFile => ({ content: "export {};\n", path: `${root}/src/rows/piece.ts` });

const importing = (path: string, specifier: string): SeedFile => ({ content: `import "${specifier}";\nexport {};\n`, path });

const check = (path: string, specifier: string, ...others: readonly string[]) =>
	layoutDomainImportViolations(inventoryOf({ sources: [importing(path, specifier), ...others.map(present)] })).map(({ message }) => message);

const ALLOWANCE = "a domain imports effect, @antumbra/feature, @antumbra/vocabulary, its own subpaths, and another domain's rows and queries";

const from = "packages/server/domains/role-settings/src/rows/role-setting.ts";

describe("domain-imports rule", () => {
	it("lets a domain read effect, the kit, the vocabulary and its own subpaths", () => {
		expect(check(from, "effect")).toEqual([]);
		expect(check(from, "effect/unstable/schema/Schema")).toEqual([]);
		expect(check(from, "@antumbra/feature/row.ts")).toEqual([]);
		expect(check(from, "@antumbra/vocabulary/agent-role.ts")).toEqual([]);
		expect(check(from, "#ids.ts")).toEqual([]);
		expect(check(from, "@antumbra/role-settings/ids.ts")).toEqual([]);
	});

	it("lets a domain read another domain's rows and queries and nothing else of it", () => {
		expect(check(from, "@antumbra/pieces/rows/piece.ts", "packages/server/domains/pieces")).toEqual([]);
		expect(check(from, "@antumbra/pieces/queries/by-voyage.ts", "packages/server/domains/pieces")).toEqual([]);
		expect(check(from, "@antumbra/pieces/commands/rename.ts", "packages/server/domains/pieces")).toEqual([
			`@antumbra/role-settings may not import @antumbra/pieces/commands/rename.ts: ${ALLOWANCE}.`,
		]);
		expect(check(from, "@antumbra/journal/rows/piece.ts", "packages/server/journal")).toEqual([
			`@antumbra/role-settings may not import @antumbra/journal/rows/piece.ts: ${ALLOWANCE}.`,
		]);
	});

	it("keeps the journal, the machine and old packages out of a domain", () => {
		expect(check(from, "@antumbra/journal/app.ts")).toEqual([`@antumbra/role-settings may not import @antumbra/journal/app.ts: ${ALLOWANCE}.`]);
		expect(check(from, "node:fs")).toEqual([`@antumbra/role-settings may not import node:fs: ${ALLOWANCE}.`]);
		expect(check(from, "@antumbra/settings")).toEqual([`@antumbra/role-settings may not import @antumbra/settings: ${ALLOWANCE}.`]);
	});

	it("leaves a domain's tests and every package outside the domains alone", () => {
		expect(check("packages/server/domains/role-settings/test/kit.ts", "@antumbra/journal/app.ts")).toEqual([]);
		expect(check("packages/server/journal/src/commit.ts", "@antumbra/feature/command.ts")).toEqual([]);
	});
});
