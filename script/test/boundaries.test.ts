import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	realpathSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { boundaryInventoryFailures } from "#boundaries/inventory.ts";

const BoundaryConfig = Schema.Struct({
	forbidden: Schema.Array(
		Schema.Struct({
			from: Schema.Struct({ path: Schema.String }),
			name: Schema.String,
			to: Schema.Struct({ path: Schema.String }),
		}),
	),
});

interface RuleFixture {
	readonly from: string;
	readonly illegal: string;
	readonly legal: string;
	readonly rule: string;
}

const scriptDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(scriptDirectory);
const entry = join(scriptDirectory, "boundaries.ts");
const require = createRequire(import.meta.url);
const rawConfig: unknown = require(
	join(repositoryRoot, ".dependency-cruiser.cjs"),
);
const config = Schema.decodeUnknownSync(BoundaryConfig)(rawConfig);
const temporaryTrees: string[] = [];

const matchingRules = (from: string, to: string) =>
	config.forbidden
		.filter(
			(rule) =>
				new RegExp(rule.from.path).test(from) &&
				new RegExp(rule.to.path).test(to),
		)
		.map(({ name }) => name);

const fixtures: readonly RuleFixture[] = [
	{
		from: "packages/agent-tools/src/tool.ts",
		illegal: "packages/vocabulary/src/change.ts",
		legal: "packages/vocabulary/src/board.ts",
		rule: "agent-tools-uses-board-vocabulary",
	},
	{
		from: "packages/artifacts/src/artifact.ts",
		illegal: "packages/vocabulary/src/board.ts",
		legal: "packages/vocabulary/src/agent-runtime.ts",
		rule: "artifacts-uses-agent-runtime-vocabulary",
	},
	{
		from: "packages/backend-codex/src/backend.ts",
		illegal: "packages/vocabulary/src/change.ts",
		legal: "packages/vocabulary/src/session-events.ts",
		rule: "agent-backends-use-session-event-vocabulary",
	},
	{
		from: "packages/boards/src/board.ts",
		illegal: "packages/vocabulary/src/change.ts",
		legal: "packages/vocabulary/src/board.ts",
		rule: "boards-uses-board-vocabulary",
	},
	{
		from: "packages/plugin-api/src/port.ts",
		illegal: "packages/vocabulary/src/board.ts",
		legal: "packages/vocabulary/src/change.ts",
		rule: "plugin-api-uses-port-vocabulary",
	},
	{
		from: "packages/renderer/src/view.ts",
		illegal: "packages/vocabulary/src/change.ts",
		legal: "packages/vocabulary/src/session-events.ts",
		rule: "renderer-uses-session-event-vocabulary",
	},
	{
		from: "packages/session-event-journal/src/journal.ts",
		illegal: "packages/vocabulary/src/agent-runtime.ts",
		legal: "packages/vocabulary/src/session-events.ts",
		rule: "session-event-journal-uses-session-event-vocabulary",
	},
	{
		from: "apps/desktop/src/main.ts",
		illegal: "packages/pieces/src/piece.ts",
		legal: "packages/domain/src/domain.ts",
		rule: "desktop-uses-domain-facade",
	},
	{
		from: "packages/domain/src/domain.ts",
		illegal: "packages/git/src/git.ts",
		legal: "packages/runner-local/src/runner.ts",
		rule: "git-only-below-branch-adapters",
	},
	{
		from: "packages/github/src/host.ts",
		illegal: "packages/persistence/src/database.ts",
		legal: "packages/plugin-api/src/change-host.ts",
		rule: "github-imports-no-application-state",
	},
	{
		from: "packages/github/src/host.ts",
		illegal: "packages/contract/src/contract.ts",
		legal: "packages/plugin-api/src/change-host.ts",
		rule: "github-imports-no-client-or-agent-surface",
	},
	{
		from: "packages/github/src/host.ts",
		illegal: "packages/backend-codex/src/backend.ts",
		legal: "packages/plugin-api/src/change-host.ts",
		rule: "github-imports-no-sibling-adapters",
	},
	{
		from: "packages/renderer/src/view.ts",
		illegal: "packages/domain/src/domain.ts",
		legal: "packages/contract/src/contract.ts",
		rule: "renderer-imports-no-runtime",
	},
	{
		from: "packages/renderer/src/view.ts",
		illegal: "packages/github/src/host.ts",
		legal: "packages/contract/src/contract.ts",
		rule: "renderer-imports-no-host-infrastructure",
	},
	{
		from: "packages/backend-claude/src/backend.ts",
		illegal: "packages/domain/src/domain.ts",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "adapters-never-import-the-domain",
	},
	{
		from: "packages/domain/src/domain.ts",
		illegal: "packages/backend-codex/src/backend.ts",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "domain-knows-ports-not-providers",
	},
	{
		from: "packages/domain/src/domain.ts",
		illegal: "electron",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "electron-only-in-desktop",
	},
	{
		from: "packages/contract/src/contract.ts",
		illegal: "packages/plugin-api/src/backend.ts",
		legal: "packages/vocabulary/src/change.ts",
		rule: "contract-imports-no-runtime-or-presentation",
	},
	{
		from: "packages/agent-tools/src/tool.ts",
		illegal: "packages/persistence/src/database.ts",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "agent-tools-imports-no-runtime-or-implementation",
	},
	{
		from: "packages/domain/src/domain.ts",
		illegal: "apps/desktop/src/main.ts",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "nothing-imports-desktop",
	},
	{
		from: "packages/domain/src/domain.ts",
		illegal: "@shivaedev/effect-prisma",
		legal: "packages/plugin-api/src/backend.ts",
		rule: "persistence-owns-the-db",
	},
];

const seedTree = (fromPackage: string, targetPackage?: string) => {
	const root = mkdtempSync(join(tmpdir(), "antumbra-boundaries-"));
	temporaryTrees.push(root);
	const from = join(root, "packages", fromPackage);
	mkdirSync(from, { recursive: true });
	if (targetPackage) {
		const target = join(root, "packages", targetPackage);
		mkdirSync(target, { recursive: true });
		writeFileSync(join(target, "index.mjs"), "export const marker = true;\n");
		writeFileSync(
			join(from, "index.mjs"),
			`export { marker } from "../${targetPackage}/index.mjs";\n`,
		);
	} else {
		writeFileSync(join(from, "index.mjs"), "export const marker = true;\n");
	}
	return realpathSync(root);
};

const runBoundaries = (root: string) =>
	spawnSync("node", [entry, root], { encoding: "utf8" });

afterEach(() => {
	for (const tree of temporaryTrees.splice(0)) {
		rmSync(tree, { force: true, recursive: true });
	}
});

describe("dependency boundary policy", () => {
	it.each(fixtures)("keeps $rule causal", ({ from, illegal, legal, rule }) => {
		expect(matchingRules(from, illegal)).toContain(rule);
		expect(matchingRules(from, legal)).not.toContain(rule);
	});

	it("reports an exact rule through dependency-cruiser", () => {
		const result = runBoundaries(seedTree("contract", "plugin-api"));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"contract-imports-no-runtime-or-presentation",
		);
	});

	it("accepts the nearest legal dependency through dependency-cruiser", () => {
		const result = runBoundaries(seedTree("contract", "vocabulary"));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("2 modules, 1 dependencies cruised");
	});

	it("fails closed when dependency-cruiser finds no dependencies", () => {
		const result = runBoundaries(seedTree("contract"));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain(
			"dependency-cruiser inspected zero dependencies",
		);
	});

	it("fails closed when an expected workspace source is absent", () => {
		expect(
			boundaryInventoryFailures(
				{ dependencies: 1, modules: ["packages/a/index.ts"] },
				["packages/a/index.ts", "packages/b/index.ts"],
			),
		).toEqual([
			"dependency-cruiser missed 1 workspace source(s): packages/b/index.ts",
		]);
	});
});
