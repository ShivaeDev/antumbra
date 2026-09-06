import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { nameError, newNameError, worktreePathForRoot, worktreeRelativePath } from "#wt/program.ts";

const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), "wt.ts");
const runWt = (...args: readonly string[]) => spawnSync("node", [entry, ...args], { encoding: "utf8" });

describe("wt new args", () => {
	it("accepts a lane task pair", () => {
		expect(newNameError(["new", "muse-helper/worktree-helper"])).toBeUndefined();
	});

	it("rejects anything but new with one name", () => {
		expect(newNameError([])).toContain("usage");
		expect(newNameError(["new"])).toContain("usage");
		expect(newNameError(["new", "a/b", "extra"])).toContain("usage");
		expect(newNameError(["rm", "a/b"])).toContain("usage");
	});

	it("rejects names outside lane slash task", () => {
		expect(newNameError(["new", "plain"])).toContain("lane");
		expect(newNameError(["new", "a/b/c"])).toContain("lane");
		expect(newNameError(["new", "Owner/task"])).toContain("lane");
		expect(newNameError(["new", "a/b_c"])).toContain("lane");
		expect(newNameError(["new", "../escape"])).toContain("lane");
		expect(newNameError(["new", "wt/task"])).toContain("wt/");
	});
});

describe("wt name validation", () => {
	it("requires a name", () => {
		expect(nameError(undefined)).toContain("usage");
		expect(nameError("")).toContain("usage");
	});

	it("allows digits and hyphens inside segments", () => {
		expect(nameError("ci2/pi-package-imports")).toBeUndefined();
	});
});

describe("wt paths", () => {
	it("mirrors the branch under .worktrees", () => {
		expect(worktreeRelativePath("muse-helper/worktree-helper")).toBe(".worktrees/muse-helper/worktree-helper");
	});

	it("anchors every worktree at the main checkout", () => {
		expect(worktreePathForRoot("/repo", "services/tool-compiler")).toBe("/repo/.worktrees/services/tool-compiler");
	});
});

describe("wt entry point", () => {
	it("exits 1 with usage when called without a name", () => {
		const result = runWt();
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("usage: pnpm wt new <lane>/<task>");
	});

	it("exits 1 naming the rule for an invalid name", () => {
		const result = runWt("new", "plain");
		expect(result.status).toBe(1);
		expect(result.stderr).toContain("lane");
	});
});
