import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const scriptDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(scriptDirectory, "boundaries.ts");
const roots: string[] = [];

const seedBareImport = (importedSubject: string, exportedSubjects: readonly string[]) => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "antumbra-boundary-")));
	roots.push(root);
	const renderer = join(root, "packages/renderer/src/view.ts");
	const vocabulary = join(root, "packages/platform/vocabulary");
	mkdirSync(dirname(renderer), { recursive: true });
	mkdirSync(join(vocabulary, "src"), { recursive: true });
	writeFileSync(renderer, `import "@antumbra/vocabulary/${importedSubject}";\nexport {};\n`);
	const exports = Object.fromEntries(exportedSubjects.map((subject) => [`./${subject}`, `./src/${subject}.ts`]));
	writeFileSync(join(vocabulary, "package.json"), JSON.stringify({ exports, name: "@antumbra/vocabulary", type: "module" }));
	for (const subject of exportedSubjects) {
		writeFileSync(join(vocabulary, `src/${subject}.ts`), "export {};\n");
	}
	const modules = join(root, "packages/renderer/node_modules/@antumbra");
	mkdirSync(modules, { recursive: true });
	symlinkSync("../../../platform/vocabulary", join(modules, "vocabulary"), "dir");
	return root;
};

const run = (root: string) => spawnSync("node", [entry, root], { encoding: "utf8" });

afterEach(() => {
	for (const root of roots.splice(0)) {
		rmSync(root, { force: true, recursive: true });
	}
});

describe("workspace package resolution", () => {
	it("catches a forbidden bare workspace import under its exact fence", () => {
		const result = run(seedBareImport("agent-runtime", ["agent-runtime"]));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"renderer-uses-session-event-vocabulary: packages/renderer/src/view.ts → packages/platform/vocabulary/src/agent-runtime.ts",
		);
	});

	it("accepts a legal bare workspace import", () => {
		const result = run(seedBareImport("session-events", ["session-events"]));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("no dependency violations found");
	});

	it("fails closed when a workspace export does not resolve", () => {
		const result = run(seedBareImport("agent-runtime", ["session-events"]));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"dependency-cruiser could not resolve workspace specifier @antumbra/vocabulary/agent-runtime from packages/renderer/src/view.ts",
		);
	});
});
