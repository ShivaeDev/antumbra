import { spawnSync } from "node:child_process";
import { globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { compileBoundaryPolicy } from "#boundaries/compiler.ts";
import { boundaryPolicyInventory, compiledBoundaryPolicy } from "#boundaries/config.ts";
import { boundaryInventoryFailures } from "#boundaries/inventory.ts";
import type { BoundaryRule, FixtureEdge, FixtureEndpoint, SanctionedException } from "#boundaries/model.ts";
import { boundaryPolicy } from "#boundaries/policy.ts";

const scriptDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(scriptDirectory);
const entry = join(scriptDirectory, "boundaries.ts");
const temporaryTrees: string[] = [];
const firstRule = boundaryPolicy[0];

const endpointPath = (endpoint: FixtureEndpoint) => (endpoint.kind === "workspace-file" ? endpoint.path : endpoint.name);

const moduleSpecifier = (from: string, to: FixtureEndpoint) => {
	if (to.kind === "external-module") {
		return to.name;
	}
	const path = relative(dirname(from), to.path).split(sep).join("/");
	return path.startsWith(".") ? path : `./${path}`;
};

const seedTree = (edges: readonly FixtureEdge[]) => {
	const root = realpathSync(mkdtempSync(join(tmpdir(), "antumbra-boundaries-")));
	temporaryTrees.push(root);
	const imports = new Map<string, Set<string>>();
	const workspaceFiles = new Set<string>();
	for (const edge of edges) {
		workspaceFiles.add(edge.from.path);
		if (edge.to.kind === "workspace-file") {
			workspaceFiles.add(edge.to.path);
		}
		const sourceImports = imports.get(edge.from.path) ?? new Set<string>();
		sourceImports.add(moduleSpecifier(edge.from.path, edge.to));
		imports.set(edge.from.path, sourceImports);
	}
	for (const path of workspaceFiles) {
		const absolute = join(root, path);
		mkdirSync(dirname(absolute), { recursive: true });
		const sourceImports = [...(imports.get(path) ?? [])].sort().map((specifier) => `import "${specifier}";`);
		writeFileSync(absolute, [...sourceImports, "export const marker = true;", ""].join("\n"));
	}
	return root;
};

const runBoundaries = (root: string) => spawnSync("node", [entry, root], { encoding: "utf8" });

const replaceRule = (rule: BoundaryRule, change: Partial<Pick<BoundaryRule, "examples" | "rationale">>): BoundaryRule =>
	Object.assign({}, rule, change);

const databaseRule = compiledBoundaryPolicy.configuration.forbidden.find(({ name }) => name === "persistence-owns-the-db");

const exceptionRule = (exception: SanctionedException): BoundaryRule => ({
	examples: firstRule.examples,
	from: {
		excludedPackages: ["persistence"],
		kind: "workspace-except",
		sanctioned: [exception],
	},
	kind: "negative-fence",
	name: "sanctioned-exception-under-test",
	rationale: "A rule that exists to exercise sanctioned exception validation.",
	to: { kind: "external-module", name: "node:sqlite" },
});

afterEach(() => {
	for (const tree of temporaryTrees.splice(0)) {
		rmSync(tree, { force: true, recursive: true });
	}
});

describe("boundary policy compiler", () => {
	it("keeps author declarations free of regular expressions", () => {
		const policyRoot = join(repositoryRoot, "script/boundaries/policy");
		for (const path of globSync("**/*.ts", { cwd: policyRoot })) {
			expect(readFileSync(join(policyRoot, path), "utf8")).not.toMatch(/\^|\(\?:|\[\^/);
		}
	});

	it("derives one configuration rule and fixture from every declaration", () => {
		const ruleNames = compiledBoundaryPolicy.configuration.forbidden.map(({ name }) => name);
		const fixtureNames = compiledBoundaryPolicy.fixtures.map(({ rule }) => rule);
		expect(ruleNames).toEqual(boundaryPolicy.map(({ name }) => name));
		expect(fixtureNames).toEqual(ruleNames);
		expect(new Set(ruleNames)).toEqual(new Set(fixtureNames));
	});

	it("rejects duplicate rule names precisely", () => {
		expect(() => compileBoundaryPolicy([firstRule, firstRule], boundaryPolicyInventory)).toThrow(
			`Boundary rule name is duplicated: ${firstRule.name}`,
		);
	});

	it("rejects an illegal example that misses its rule", () => {
		const broken = replaceRule(firstRule, {
			examples: {
				...firstRule.examples,
				illegal: firstRule.examples.legal,
			},
		});
		expect(() => compileBoundaryPolicy([broken], boundaryPolicyInventory)).toThrow(
			`Illegal example for ${firstRule.name} must violate only that rule`,
		);
	});

	it("rejects a legal example that crosses its rule", () => {
		const broken = replaceRule(firstRule, {
			examples: {
				...firstRule.examples,
				legal: firstRule.examples.illegal,
			},
		});
		expect(() => compileBoundaryPolicy([broken], boundaryPolicyInventory)).toThrow(`Legal example for ${firstRule.name} must pass every rule`);
	});

	it("rejects an empty rationale precisely", () => {
		const broken = replaceRule(firstRule, { rationale: "" });
		expect(() => compileBoundaryPolicy([broken], boundaryPolicyInventory)).toThrow(`Boundary rule has no rationale: ${firstRule.name}`);
	});

	it("rejects incomplete sanctioned exceptions", () => {
		for (const exception of [
			{
				package: "trace-sink",
				rationale: "It writes its own file.",
				ruling: "  ",
			},
			{
				package: "trace-sink",
				rationale: "",
				ruling: "dev trace sink",
			},
			{
				package: "",
				rationale: "It writes its own file.",
				ruling: "dev trace sink",
			},
		]) {
			expect(() => compileBoundaryPolicy([exceptionRule(exception)], boundaryPolicyInventory)).toThrow(
				"Sanctioned exception in sanctioned-exception-under-test needs a package, a ruling, and a rationale",
			);
		}
	});
});

describe("the sanctioned exception to persistence owning the database", () => {
	it("carries its ruling and reason into the generated configuration", () => {
		expect(databaseRule?.comment).toContain("dev trace sink");
		expect(databaseRule?.comment).toContain("packages/trace-sink");
		expect(databaseRule?.comment).toContain("Database access exists only behind the persistence package.");
	});

	it("exempts the sanctioned package and no neighbour of it", () => {
		const consumers = new RegExp(databaseRule?.from.path ?? "$^");
		expect(consumers.test("packages/trace-sink/src/adapters/database.ts")).toBe(false);
		expect(consumers.test("packages/trace-sink/test/trace-sink.test.ts")).toBe(false);
		expect(consumers.test("packages/persistence/src/database.ts")).toBe(false);
		expect(consumers.test("packages/trace-sink-adjacent/src/store.ts")).toBe(true);
		expect(consumers.test("packages/domain/src/domain.ts")).toBe(true);
		expect(consumers.test("apps/desktop/src/main.ts")).toBe(true);
	});
});

describe("dependency boundary policy", () => {
	it("reports every generated illegal example under its exact rule", () => {
		const result = runBoundaries(seedTree(compiledBoundaryPolicy.fixtures.map(({ illegal }) => illegal)));
		expect(result.status).toBe(1);
		for (const { illegal, rule } of compiledBoundaryPolicy.fixtures) {
			expect(result.stderr).toContain(`${rule}: ${illegal.from.path} → ${endpointPath(illegal.to)}`);
		}
		const reportedRules = result.stderr
			.split("\n")
			.map((line) => line.slice(0, line.indexOf(":")))
			.filter((name) => compiledBoundaryPolicy.fixtures.some(({ rule }) => rule === name));
		expect(reportedRules.sort()).toEqual(compiledBoundaryPolicy.fixtures.map(({ rule }) => rule).sort());
	});

	it("accepts every generated nearest legal example", () => {
		const result = runBoundaries(seedTree(compiledBoundaryPolicy.fixtures.map(({ legal }) => legal)));
		expect(result.status).toBe(0);
		expect(result.stdout).toContain("no dependency violations found");
	});

	it("fails closed when dependency-cruiser finds no dependencies", () => {
		const edge = firstRule.examples.legal;
		const root = seedTree([edge]);
		writeFileSync(join(root, edge.from.path), "export const marker = true;\n");
		const result = runBoundaries(root);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("dependency-cruiser inspected zero dependencies");
	});

	it("fails closed when dependency-cruiser finds no modules", () => {
		expect(boundaryInventoryFailures({ dependencies: 1, dependencyEvidence: [], modules: [] }, [])).toEqual([
			"dependency-cruiser inspected zero modules",
		]);
	});

	it("fails closed when an expected workspace source is absent", () => {
		expect(
			boundaryInventoryFailures(
				{
					dependencies: 1,
					dependencyEvidence: [],
					modules: ["packages/a/index.ts"],
				},
				["packages/a/index.ts", "packages/b/index.ts"],
			),
		).toEqual(["dependency-cruiser missed 1 workspace source(s): packages/b/index.ts"]);
	});
});
