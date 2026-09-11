import { describe, expect, it } from "vitest";
import { layoutNodeViolations } from "#lint/rules/layout-node.ts";
import type { SeedFile } from "#test/support/inventory.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const importing = (path: string, specifier: string): SeedFile => ({
	content: `import "${specifier}";\nexport {};\n`,
	path,
});

const check = (path: string, specifier: string) =>
	layoutNodeViolations(inventoryOf({ sources: [importing(path, specifier)] })).map(({ message }) => message);

describe("node-only-in-apps rule", () => {
	it("lets a package under any group read a pure module", () => {
		expect(check("packages/platform/skills/src/folders.ts", "node:path")).toEqual([]);
		expect(check("packages/platform/skills/src/folders.ts", "node:url")).toEqual([]);
	});

	it("lets the two named places own their file", () => {
		expect(check("packages/server/journal/src/journal.ts", "@effect/sql-sqlite-node/SqliteClient")).toEqual([]);
		expect(check("packages/platform/trace-sink/src/adapters/database.ts", "node:sqlite")).toEqual([]);
		expect(check("packages/server/journal/src/journal.ts", "node:sqlite")).toEqual([
			"@antumbra/server-journal may not import node:sqlite: only a package under apps/ may reach the machine.",
		]);
	});

	it("keeps the Node platform out of a platform package", () => {
		expect(check("packages/platform/rpc/src/transport.ts", "@effect/platform-node")).toEqual([
			"@antumbra/platform-rpc may not import @effect/platform-node: only a package under apps/ may reach the machine.",
		]);
		expect(check("packages/platform/rpc/src/transport.ts", "ws")).toEqual([
			"@antumbra/platform-rpc may not import ws: only a package under apps/ may reach the machine.",
		]);
	});

	it("keeps the machine out of a server package, prefixed or not", () => {
		expect(check("packages/server/domains/pieces/src/run.ts", "node:child_process")).toEqual([
			"@antumbra/domain-pieces may not import node:child_process: only a package under apps/ may reach the machine.",
		]);
		expect(check("packages/server/domains/pieces/src/run.ts", "fs")).toEqual([
			"@antumbra/domain-pieces may not import fs: only a package under apps/ may reach the machine.",
		]);
	});

	it("leaves apps, test files and flat packages alone", () => {
		expect(check("apps/server/src/main.ts", "node:http")).toEqual([]);
		expect(check("packages/platform/skills/test/shipped-skills.test.ts", "@effect/platform-node")).toEqual([]);
		expect(check("packages/kernel/src/run.ts", "node:child_process")).toEqual([]);
	});
});
