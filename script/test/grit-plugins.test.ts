import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import rawAmbientCases from "#test/fixtures/ambient-runtime-cases.json" with { type: "json" };
import rawEffectCases from "#test/fixtures/effect-boundaries-cases.json" with { type: "json" };
import rawImportCases from "#test/fixtures/imports-cases.json" with { type: "json" };
import rawAssertionCases from "#test/fixtures/type-assertions-cases.json" with { type: "json" };
import { decodeGritCases } from "#test/support/fixture-schemas.ts";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const biome = join(root, "node_modules", ".bin", "biome");
const seeded: string[] = [];
const ambientCases = decodeGritCases(rawAmbientCases);
const effectCases = decodeGritCases(rawEffectCases);
const importCases = decodeGritCases(rawImportCases);
const assertionCases = decodeGritCases(rawAssertionCases);
const suites = [
	{ cases: effectCases, name: "Effect boundaries" },
	{ cases: ambientCases, name: "ambient runtime" },
	{ cases: assertionCases, name: "type assertions" },
	{ cases: importCases, name: "imports" },
];

const lint = (path: string, content: string) => {
	const testRoot = mkdtempSync(join(tmpdir(), "antumbra-grit-plugin-"));
	const target = join(testRoot, path);
	seeded.push(testRoot);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, content);
	return spawnSync(biome, ["lint", `--config-path=${root}`, target], {
		cwd: root,
		encoding: "utf8",
	});
};

afterEach(() => {
	for (const path of seeded.splice(0)) {
		rmSync(path, { force: true, recursive: true });
	}
});

describe("GritQL syntax guards", () => {
	for (const suite of suites) {
		for (const seeded of suite.cases.flagged) {
			it(`flags ${suite.name}: ${seeded.name}`, () => {
				const result = lint(seeded.path, seeded.content);
				expect(`${result.stdout}${result.stderr}`).toContain(seeded.message);
				expect(result.status).toBe(1);
			});
		}

		for (const seeded of suite.cases.allowed) {
			it(`allows ${suite.name}: ${seeded.name}`, () => {
				const result = lint(seeded.path, seeded.content);
				expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
			});
		}
	}
});
