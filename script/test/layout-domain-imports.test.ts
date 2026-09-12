import { describe, expect, it } from "vitest";
import { layoutDomainImportViolations } from "#lint/rules/layout-domain-imports.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const present = (root: string): SeedFile => ({ content: "export {};\n", path: `${root}/src/rows/piece.ts` });

const importing = (path: string, specifier: string): SeedFile => ({ content: `import "${specifier}";\nexport {};\n`, path });

const check = (path: string, specifier: string, ...others: readonly string[]) =>
	layoutDomainImportViolations(inventoryOf({ sources: [importing(path, specifier), ...others.map(present)] })).map(({ message }) => message);

const SOURCES =
	"a domain's sources import effect, @antumbra/platform-feature, @antumbra/platform-vocabulary, its own subpaths, and another domain's rows, queries and ids";

const TESTS =
	"a domain's tests import effect, vitest, @antumbra/app-testing, @antumbra/platform-feature, @antumbra/platform-vocabulary, its own subpaths, and another domain's rows, queries and ids";

const from = "packages/server/domains/role-settings/src/rows/role-setting.ts";

const kit = "packages/server/domains/role-settings/test/kit.ts";

describe("domain-imports rule", () => {
	it("lets a domain read effect, the kit, the vocabulary and its own subpaths", () => {
		expect(check(from, "effect")).toEqual([]);
		expect(check(from, "effect/unstable/schema/Schema")).toEqual([]);
		expect(check(from, "@antumbra/platform-feature/row.ts")).toEqual([]);
		expect(check(from, "@antumbra/platform-vocabulary/agent-role.ts")).toEqual([]);
		expect(check(from, "#ids.ts")).toEqual([]);
		expect(check(from, "@antumbra/domain-role-settings/ids.ts")).toEqual([]);
	});

	it("lets a domain read another domain's rows, queries and ids and nothing else of it", () => {
		expect(check(from, "@antumbra/domain-pieces/rows/piece.ts", "packages/server/domains/pieces")).toEqual([]);
		expect(check(from, "@antumbra/domain-pieces/queries/by-voyage.ts", "packages/server/domains/pieces")).toEqual([]);
		expect(check(from, "@antumbra/domain-pieces/ids.ts", "packages/server/domains/pieces")).toEqual([]);
		expect(check(from, "@antumbra/domain-pieces/feature.ts", "packages/server/domains/pieces")).toEqual([
			`@antumbra/domain-role-settings sources may not import @antumbra/domain-pieces/feature.ts: ${SOURCES}.`,
		]);
		expect(check(from, "@antumbra/domain-pieces/commands/rename.ts", "packages/server/domains/pieces")).toEqual([
			`@antumbra/domain-role-settings sources may not import @antumbra/domain-pieces/commands/rename.ts: ${SOURCES}.`,
		]);
		expect(check(from, "@antumbra/server-journal/rows/piece.ts", "packages/server/journal")).toEqual([
			`@antumbra/domain-role-settings sources may not import @antumbra/server-journal/rows/piece.ts: ${SOURCES}.`,
		]);
	});

	it("keeps the journal, the machine and old packages out of a domain", () => {
		expect(check(from, "@antumbra/server-journal/app.ts")).toEqual([
			`@antumbra/domain-role-settings sources may not import @antumbra/server-journal/app.ts: ${SOURCES}.`,
		]);
		expect(check(from, "node:fs")).toEqual([`@antumbra/domain-role-settings sources may not import node:fs: ${SOURCES}.`]);
		expect(check(from, "@antumbra/settings")).toEqual([`@antumbra/domain-role-settings sources may not import @antumbra/settings: ${SOURCES}.`]);
		expect(check(from, "vitest")).toEqual([`@antumbra/domain-role-settings sources may not import vitest: ${SOURCES}.`]);
	});

	it("allows test primitives and public domain readings", () => {
		expect(check(kit, "vitest")).toEqual([]);
		expect(check(kit, "@antumbra/app-testing/entry.ts")).toEqual([]);
		expect(check(kit, "effect")).toEqual([]);
		expect(check(kit, "#test/kit.ts")).toEqual([]);
		expect(check(kit, "@antumbra/domain-pieces/queries/by-voyage.ts", "packages/server/domains/pieces")).toEqual([]);
	});

	it("keeps application composition out of domain unit tests", () => {
		expect(check(kit, "@antumbra/domain-pieces/feature.ts", "packages/server/domains/pieces")).toEqual([
			`@antumbra/domain-role-settings tests may not import @antumbra/domain-pieces/feature.ts: ${TESTS}.`,
		]);
		expect(check(kit, "@antumbra/server-journal/testing/kit.ts")).toEqual([
			`@antumbra/domain-role-settings tests may not import @antumbra/server-journal/testing/kit.ts: ${TESTS}.`,
		]);
	});

	it("keeps another domain's commands out of a domain's tests", () => {
		expect(check(kit, "@antumbra/domain-pieces/commands/rename.ts", "packages/server/domains/pieces")).toEqual([
			`@antumbra/domain-role-settings tests may not import @antumbra/domain-pieces/commands/rename.ts: ${TESTS}.`,
		]);
	});

	it("keeps the machine, the rest of the journal and old packages out of a domain's tests", () => {
		expect(check(kit, "@effect/platform-node")).toEqual([`@antumbra/domain-role-settings tests may not import @effect/platform-node: ${TESTS}.`]);
		expect(check(kit, "@antumbra/settings")).toEqual([`@antumbra/domain-role-settings tests may not import @antumbra/settings: ${TESTS}.`]);
		expect(check(kit, "@antumbra/server-journal/app.ts")).toEqual([
			`@antumbra/domain-role-settings tests may not import @antumbra/server-journal/app.ts: ${TESTS}.`,
		]);
	});

	it("leaves every package outside the domains alone", () => {
		expect(check("packages/server/journal/src/commit.ts", "@antumbra/platform-feature/command.ts")).toEqual([]);
		expect(check("packages/server/journal/test/kit.ts", "@antumbra/settings")).toEqual([]);
	});
});
