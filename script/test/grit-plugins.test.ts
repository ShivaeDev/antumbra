import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import rawEffectCases from "#test/fixtures/effect-boundaries-cases.json" with { type: "json" };
import rawImportCases from "#test/fixtures/imports-cases.json" with { type: "json" };
import { decodeGritCases } from "#test/support/fixture-schemas.ts";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const biome = join(root, "node_modules", ".bin", "biome");
const seeded: string[] = [];
const configuration = Schema.decodeUnknownSync(
	Schema.Struct({ plugins: Schema.Array(Schema.Struct({ path: Schema.String, includes: Schema.Array(Schema.String) })) }),
)(JSON.parse(readFileSync(join(root, "biome.json"), "utf8")));

const decodeReport = Schema.decodeUnknownSync(
	Schema.Struct({
		diagnostics: Schema.Array(Schema.Struct({ message: Schema.String })),
		summary: Schema.Struct({ unchanged: Schema.Number }),
	}),
);

const effectCases = decodeGritCases(rawEffectCases);
const importCases = decodeGritCases(rawImportCases);
const suites = [
	{ cases: effectCases, name: "Effect boundaries" },
	{ cases: importCases, name: "imports" },
];

const lint = (path: string, content: string) => {
	const testRoot = realpathSync(mkdtempSync(join(tmpdir(), "antumbra-grit-plugin-")));
	const target = join(testRoot, path);
	seeded.push(testRoot);
	mkdirSync(dirname(target), { recursive: true });
	symlinkSync(join(root, "node_modules"), join(testRoot, "node_modules"));
	writeFileSync(join(testRoot, ".gitignore"), "node_modules/\n");
	writeFileSync(
		join(testRoot, "biome.json"),
		JSON.stringify({
			extends: [join(root, "node_modules/@shivaedev/quality/biome/preset.json")],
			plugins: configuration.plugins.map((plugin) => ({ ...plugin, path: join(root, plugin.path) })),
		}),
	);
	writeFileSync(target, content);
	const result = spawnSync(biome, ["lint", target, "--reporter=json"], {
		cwd: testRoot,
		encoding: "utf8",
	});
	const report = decodeReport(JSON.parse(result.stdout));
	expect(report.summary.unchanged).toBe(1);
	return { status: result.status, output: report.diagnostics.map((entry) => entry.message).join("\n") };
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
				expect(result.output).toContain(seeded.message);
				expect(result.status).toBe(1);
			});
		}

		for (const seeded of suite.cases.allowed) {
			it(`allows ${suite.name}: ${seeded.name}`, () => {
				const result = lint(seeded.path, seeded.content);
				const output = result.output;

				for (const flagged of suite.cases.flagged) {
					expect(output).not.toContain(flagged.message);
				}
				expect(result.status, output).not.toBe(101);
			});
		}
	}
});
