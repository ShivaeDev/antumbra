import { describe, expect, it } from "vitest";
import { layoutTestsViolations } from "#lint/rules/layout-tests.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const check = (path: string, content: string) => layoutTestsViolations(inventoryOf({ sources: [{ content, path }] })).map(({ message }) => message);

const importing = (specifier: string) => `import "${specifier}";\nexport {};\n`;

const usingNode = (name: string) => `import { ${name} } from "@effect/platform-node";\nexport {};\n`;

describe("tests-own-their-processes rule", () => {
	it("reports a test that kills the global process", () => {
		expect(check("packages/server/journal/test/restart.test.ts", "process.kill(7);\nexport {};\n")).toEqual([
			"packages/server/journal/test/restart.test.ts kills or scans processes by pid: a test owns only the children it spawned.",
		]);
	});

	it("leaves a spawned child's handle alone", () => {
		expect(
			check(
				"packages/server/journal/test/restart.test.ts",
				"export function* run(spawner: Spawner) {\n\tconst process = yield* spawner.spawn('git');\n\tyield* process.kill();\n}\n",
			),
		).toEqual([]);
		expect(check("packages/server/journal/test/restart.test.ts", "export const stop = (process: Child) => process.kill();\n")).toEqual([]);
	});

	it("reports a test that scans processes by name", () => {
		expect(check("script/test/reclaim.test.ts", 'const command = "pkill -f runner";\nexport { command };\n')).toEqual([
			"script/test/reclaim.test.ts kills or scans processes by pid: a test owns only the children it spawned.",
		]);
	});

	it("keeps the spawner out of a nested test and lets the named owner keep it", () => {
		expect(check("packages/platform/rpc/test/group.test.ts", importing("node:child_process"))).toEqual([
			"@antumbra/platform-rpc tests may not spawn: node:child_process; only a package under apps/ runs children.",
		]);
		expect(check("packages/platform/service-definition/test/compiler-fixtures.test.ts", importing("node:child_process"))).toEqual([]);
	});

	it("keeps the whole Node service set out of a nested test and lets a single service in", () => {
		expect(check("packages/server/journal/test/live.test.ts", usingNode("NodeServices"))).toEqual([
			"@antumbra/server-journal tests may not spawn: NodeServices; only a package under apps/ runs children.",
		]);
		expect(check("packages/server/journal/test/file.test.ts", usingNode("NodeFileSystem"))).toEqual([]);
	});

	it("leaves source files alone", () => {
		expect(check("packages/server/journal/src/journal.ts", `${importing("node:child_process")}process.kill(7);\n`)).toEqual([]);
	});
});
