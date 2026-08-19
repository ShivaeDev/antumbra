import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const workspaceDirectory = fileURLToPath(new URL("../../..", import.meta.url));

const compile = (compiler: "tsc" | "tsc6", arguments_: ReadonlyArray<string>) =>
	spawnSync(
		join(workspaceDirectory, "node_modules", ".bin", compiler),
		arguments_,
		{
			cwd: packageDirectory,
			encoding: "utf8",
		},
	);

describe("service definition compiler fixtures", () => {
	for (const compiler of ["tsc", "tsc6"] as const) {
		it(`${compiler} emits the supported declaration surface`, () => {
			const output = mkdtempSync(join(tmpdir(), `antumbra-${compiler}-`));
			try {
				const result = compile(compiler, [
					"-p",
					"test/fixtures/tsconfig.json",
					"--outDir",
					output,
				]);
				expect(result.stderr || result.stdout).toBe("");
				expect(result.status).toBe(0);
				const declaration = readFileSync(
					join(output, "test/fixtures/valid.d.ts"),
					"utf8",
				);
				expect(declaration).toContain("genericIdentity:");
				expect(declaration).toContain("overloaded:");
				expect(declaration).toContain("use:");
				expect(declaration).toContain("...arguments_: number[]");
				expect(declaration).toContain(
					"Effect.Effect<number, FixtureFailure, never>",
				);
				expect(declaration).toContain(
					'Layer<"fixture/Ordinary", never, Declared | Residual>',
				);
				expect(declaration).toContain(
					'Layer<"fixture/Initialized", never, Declared | Residual>',
				);
				expect(declaration).toContain(
					"Effect.Effect<Success, Failure, Residual>",
				);
				expect(declaration).toContain("readonly layer");
			} finally {
				rmSync(output, { force: true, recursive: true });
			}
		});

		for (const fixture of ["generic", "overloaded"] as const) {
			it(`${compiler} rejects direct ${fixture} operation mapping`, () => {
				const result = compile(compiler, [
					"--ignoreConfig",
					"--noEmit",
					"--strict",
					"--skipLibCheck",
					"--target",
					"ESNext",
					"--module",
					"ESNext",
					"--moduleResolution",
					"Bundler",
					"--allowImportingTsExtensions",
					`test/fixtures/invalid/${fixture}.ts`,
				]);
				const diagnostics = result.stderr || result.stdout;
				expect(result.status).not.toBe(0);
				expect(diagnostics).toContain(`invalid/${fixture}.ts`);
				expect(diagnostics).toContain(
					"GenericOrOverloadedOperationsRequireAnInitializerEffect",
				);
			});
		}

		it(`${compiler} rejects a direct undeclared residual requirement`, () => {
			const result = compile(compiler, [
				"--ignoreConfig",
				"--noEmit",
				"--strict",
				"--skipLibCheck",
				"--target",
				"ESNext",
				"--module",
				"ESNext",
				"--moduleResolution",
				"Bundler",
				"--allowImportingTsExtensions",
				"test/fixtures/invalid/residual.ts",
			]);
			const diagnostics = result.stderr || result.stdout;
			expect(result.status).not.toBe(0);
			expect(diagnostics).toContain(
				"OperationHasUndeclaredServiceRequirements",
			);
		});

		for (const fixture of [
			"requirement",
			"generic-requirement",
			"initializer",
		] as const) {
			it(`${compiler} rejects ${fixture} service leakage`, () => {
				const result = compile(compiler, [
					"--ignoreConfig",
					"--noEmit",
					"--strict",
					"--skipLibCheck",
					"--target",
					"ESNext",
					"--module",
					"ESNext",
					"--moduleResolution",
					"Bundler",
					"--allowImportingTsExtensions",
					`test/fixtures/invalid/${fixture}.ts`,
				]);
				const diagnostics = result.stderr || result.stdout;
				expect(result.status).not.toBe(0);
				expect(diagnostics).toContain(`invalid/${fixture}.ts`);
				expect(diagnostics).toContain("Secret");
			});
		}
	}
});
