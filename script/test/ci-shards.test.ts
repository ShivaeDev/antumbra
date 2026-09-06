import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { workspacePackageNames } from "#vitest.workspace.ts";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const RootManifest = Schema.Struct({
	scripts: Schema.Record(Schema.String, Schema.String),
});
const TestScripts = Schema.Struct({
	"test:desktop": Schema.String,
	"test:packages": Schema.String,
});

const decodeRootManifest = Schema.decodeUnknownSync(Schema.fromJsonString(RootManifest));

const packageNames = (directory: string, name: string): readonly string[] =>
	existsSync(join(directory, "package.json"))
		? [name]
		: readdirSync(directory, { withFileTypes: true })
				.filter((entry) => entry.isDirectory())
				.flatMap((entry) => packageNames(join(directory, entry.name), name === "" ? entry.name : `${name}/${entry.name}`));

const packageDirectories = (): readonly string[] => packageNames(join(repoRoot, "packages"), "").toSorted();

describe("CI test shards", () => {
	it("shards package suites and keeps Electron and git-worktree suites separate", () => {
		const manifest = decodeRootManifest(readFileSync(join(repoRoot, "package.json"), "utf8"));
		const scripts = Schema.decodeUnknownSync(TestScripts)({
			"test:desktop": manifest.scripts["test:desktop"],
			"test:packages": manifest.scripts["test:packages"],
		});
		const workflow = readFileSync(join(repoRoot, ".github/workflows/ci.yml"), "utf8");
		expect(scripts["test:packages"]).toContain("script/vitest.workspace.ts");
		expect(scripts["test:desktop"]).toContain("@antumbra/desktop");
		expect(workspacePackageNames).toEqual(packageDirectories().filter((name) => name !== "runner-local"));
		expect(workspacePackageNames).toContain("renderer");
		expect(workspacePackageNames).toContain("platform/vocabulary");
		expect(workspacePackageNames).toContain("git");
		expect(workspacePackageNames).not.toContain("platform");
		expect(workspacePackageNames).not.toContain("runner");
		expect(workspacePackageNames).not.toContain("desktop");
		expect(workspacePackageNames).not.toContain("runner-local");
		expect(workflow).toContain("script/vitest.workspace.ts");
		expect(workflow).toContain("matrix.shard");
		expect(workflow).toContain("pnpm test:desktop");
		expect(workflow).toContain("pnpm test:runner-local");
		expect(workflow).toContain("shard: [1, 2, 3, 4, 5, 6, 7, 8]");
	});
});
