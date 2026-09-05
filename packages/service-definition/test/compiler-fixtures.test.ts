import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const workspaceDirectory = fileURLToPath(new URL("../../..", import.meta.url));

const compile = (compiler: "tsc" | "tsc6", arguments_: ReadonlyArray<string>) =>
	spawnSync(join(workspaceDirectory, "node_modules", ".bin", compiler), arguments_, {
		cwd: packageDirectory,
		encoding: "utf8",
	});

const invalidArguments = (fixtures: ReadonlyArray<string>) => [
	"--ignoreConfig",
	"--noEmit",
	"--noErrorTruncation",
	"--pretty",
	"false",
	"--strict",
	"--skipLibCheck",
	"--target",
	"ESNext",
	"--module",
	"ESNext",
	"--moduleResolution",
	"Bundler",
	"--allowImportingTsExtensions",
	...fixtures.map((fixture) => `test/fixtures/invalid/${fixture}.ts`),
];

describe("service definition compiler fixtures", () => {
	for (const compiler of ["tsc", "tsc6"] as const) {
		it(`${compiler} emits only the initialized public service surface`, () => {
			const output = mkdtempSync(join(tmpdir(), `antumbra-${compiler}-`));
			try {
				const result = compile(compiler, ["-p", "test/fixtures/tsconfig.json", "--outDir", output]);
				expect(result.stderr || result.stdout).toBe("");
				expect(result.status).toBe(0);
				const declaration = readFileSync(join(output, "test/fixtures/valid.d.ts"), "utf8");
				expect(declaration).toContain("...arguments_: number[]");
				expect(declaration).toContain("Effect.Effect<number, MethodFailure, never>");
				expect(declaration).toContain("Scope.Scope");
				expect(declaration).toContain('Layer<"fixture/Ordinary", InitializationFailure, Declared | Residual>');
				expect(declaration).toContain("preserve: <Success, Failure, Requirements>");
				expect(declaration).toContain("readonly value: Success;\n    }, Failure | GenericFailure, Requirements>");
				expect(declaration).toContain('Layer<"fixture/Generic", never, never>');
				expect(declaration).not.toContain("PrivateState");
				expect(declaration).not.toContain("initialize");
				expect(declaration).not.toContain("methods");
			} finally {
				rmSync(output, { force: true, recursive: true });
			}
		});

		const invalidFixtures = {
			"caller-requirement": "missing the following properties from type 'Scope'",
			fake: "second",
			generic: "GenericOrStructurallyOverloadedMethodsAreUnsupported",
			"generic-declared-requirement": "GenericMethodWithDeclaredRequirementsIsUnsupported",
			"generic-marker-overloaded": "GenericOrStructurallyOverloadedMethodsAreUnsupported",
			"initializer-requirement": "InitializerHasUndeclaredServiceRequirements",
			"method-requirement": "MethodHasUndeclaredServiceRequirements",
			"method-value": "not assignable",
			overloaded: "GenericOrStructurallyOverloadedMethodsAreUnsupported",
			"overloaded-broad": "GenericOrStructurallyOverloadedMethodsAreUnsupported",
			"private-state": "Property 'secret' does not exist",
			"requirement-free-ordinary-requirement": "MethodHasUndeclaredServiceRequirements",
			"scope-requirement": "ScopeCannotBeDeclaredAsAServiceRequirement",
		} as const;

		it(`${compiler} rejects each invalid service definition`, () => {
			const result = compile(compiler, invalidArguments(Object.keys(invalidFixtures)));
			const diagnostics = (result.stderr || result.stdout).split(/(?=^test\/fixtures\/invalid\/)/m);
			expect(result.status).not.toBe(0);
			for (const [fixture, expectedDiagnostic] of Object.entries(invalidFixtures)) {
				const fixtureDiagnostics = diagnostics.filter((message) => message.startsWith(`test/fixtures/invalid/${fixture}.ts(`)).join("\n");
				expect(fixtureDiagnostics, fixture).toContain(expectedDiagnostic);
			}
		});
	}
});
