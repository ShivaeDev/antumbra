import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// why: these tests spawn the guard CLIs against synthetic trees — the guards
// themselves must be proven to fire, not just assumed to.

const scriptDir = dirname(dirname(fileURLToPath(import.meta.url)));
const roots: string[] = [];

const makeRoot = (): string => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-guards-"));
	roots.push(root);
	return root;
};

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

const seed = (root: string, rel: string, content: string): void => {
	const full = join(root, rel);
	mkdirSync(dirname(full), { recursive: true });
	writeFileSync(full, content);
};

const run = (script: string, args: readonly string[]) =>
	spawnSync("node", [join(scriptDir, script), ...args], { encoding: "utf8" });

describe("lint-structure", () => {
	it("fails a source file over 150 lines", () => {
		const root = makeRoot();
		seed(
			root,
			"packages/x/src/big.ts",
			`${"export const n = 1;\n".repeat(151)}`,
		);
		const result = run("lint-structure.ts", [root]);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("big.ts");
		expect(result.stderr).toContain("150-line limit");
	});

	it("fails an index.ts barrel outside the package entry", () => {
		const root = makeRoot();
		seed(root, "packages/x/src/things/index.ts", "export {};\n");
		const result = run("lint-structure.ts", [root]);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("barrels are banned");
	});

	it("passes the package entry index.ts and a clean tree", () => {
		const root = makeRoot();
		seed(root, "packages/x/src/index.ts", "export {};\n");
		const result = run("lint-structure.ts", [root]);
		expect(result.status).toBe(0);
	});
});

describe("lint-patterns", () => {
	const cases: ReadonlyArray<readonly [string, string, string]> = [
		["no-async-await", "export const f = async () => 1;\n", "async"],
		["no-raw-promise", "export const p = other.then(handle);\n", "Promises"],
		["no-try-catch", "try {\n} catch (e) {\n}\nexport {};\n", "try/catch"],
		["no-ambient-time", "export const t = Date.now();\n", "Clock"],
		["no-ambient-random", "export const r = Math.random();\n", "Random"],
		["no-console", "console.log(1);\nexport {};\n", "logger"],
		["no-process-env", "export const e = process.env.HOME;\n", "Config"],
		["no-ts-ignore", "export const v = 1; // @ts-ignore\n", "never allowed"],
		[
			"no-plain-comment",
			"export const c = 1; // explains the obvious\n",
			"why:",
		],
	];

	for (const [id, content, needle] of cases) {
		it(`fires ${id}`, () => {
			const root = makeRoot();
			seed(root, "packages/x/src/mod.ts", content);
			const result = run("lint-patterns.ts", [root]);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain(id);
			expect(result.stderr).toContain(needle);
		});
	}

	it("allows why:-marked comments and URLs in strings", () => {
		const root = makeRoot();
		seed(
			root,
			"packages/x/src/mod.ts",
			'export const url = "https://example.com";\nexport const k = 1; // why: constraint the type system cannot express\n',
		);
		const result = run("lint-patterns.ts", [root]);
		expect(result.status).toBe(0);
	});

	it("exempts adapter modules from the Effect-purity bans", () => {
		const root = makeRoot();
		seed(
			root,
			"packages/x/src/adapters/sdk.ts",
			"export const f = async () => 1;\n",
		);
		const result = run("lint-patterns.ts", [root]);
		expect(result.status).toBe(0);
	});
});

describe("lint-pragmas", () => {
	it("fails an unregistered pragma", () => {
		const root = makeRoot();
		seed(root, "script/pragma-registry.json", "[]\n");
		seed(
			root,
			"packages/x/src/mod.ts",
			"export const v = 1 as never; // biome-ignore lint/suspicious/noExplicitAny: probing\n",
		);
		const result = run("lint-pragmas.ts", [root]);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("without a registry entry");
	});

	it("passes a registered pragma", () => {
		const root = makeRoot();
		seed(
			root,
			"script/pragma-registry.json",
			JSON.stringify([
				{
					file: "packages/x/src/mod.ts",
					pragma: "biome-ignore lint/suspicious/noExplicitAny",
					reason: "probing the guard",
				},
			]),
		);
		seed(
			root,
			"packages/x/src/mod.ts",
			"export const v = 1 as never; // biome-ignore lint/suspicious/noExplicitAny: probing\n",
		);
		const result = run("lint-pragmas.ts", [root]);
		expect(result.status).toBe(0);
	});
});
