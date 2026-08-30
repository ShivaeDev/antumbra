import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GitAuthRequired } from "@antumbra/git";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { toRunnerError } from "#git-runtime.ts";
import { AGENT, berthing, git, makeHarbor, provision } from "#test/harbor.ts";

const commonDirectory = (path: string) => git(["-C", path, "rev-parse", "--git-common-dir"]).pipe(Effect.map((output) => output.trim()));

const branchListing = (mirror: string, branch: string) => git(["-C", mirror, "branch", "--list", branch]);

describe("local runner", () => {
	it("preserves retryable authentication failures at the runner port", () => {
		const failure = toRunnerError(
			new GitAuthRequired({
				detail: "credential expired",
				operation: "refresh-mirror",
			}),
		);
		expect(failure._tag).toBe("RunnerAuthRequired");
	});

	it.live("reclaims a clean berth and removes worktree and branch", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			const verdict = yield* runner.reclaim(berth);
			expect(verdict._tag).toBe("reclaimed");
			expect(existsSync(berth.path)).toBe(false);
			const repeated = yield* runner.reclaim(berth);
			expect(repeated._tag).toBe("reclaimed");
		}),
	);

	it.live("captures immutable change evidence from the exact berth", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			yield* Effect.sync(() => {
				writeFileSync(join(berth.path, "README.md"), "changed\n");
				writeFileSync(join(berth.path, "untracked.md"), "new\n");
			});

			const evidence = yield* runner.captureChange(berth);
			expect(evidence.branch).toBe(berth.branch);
			expect(evidence.headSha).toMatch(/^[0-9a-f]+$/u);
			expect(evidence.worktreePath).toBe(berth.path);
			expect(evidence.workingDiff).toContain("-ahoy");
			expect(evidence.workingTreeStatus).toContain("?? untracked.md");
		}),
	);

	it.live("finishes reclaim when branch cleanup fails after removing the worktree", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			const mirror = yield* commonDirectory(berth.path);
			const branchLock = join(mirror, "refs", "heads", `${berth.branch}.lock`);
			yield* Effect.sync(() => writeFileSync(branchLock, "locked\n"));
			const failure = yield* Effect.flip(runner.reclaim(berth)).pipe(Effect.ensuring(Effect.sync(() => rmSync(branchLock, { force: true }))));
			expect(failure.detail).toContain("delete-branch");
			expect(existsSync(berth.path)).toBe(false);
			const residue = yield* branchListing(mirror, berth.branch);
			expect(residue).toContain(berth.branch);
			const verdict = yield* runner.reclaim(berth);
			expect(verdict._tag).toBe("reclaimed");
			const branches = yield* branchListing(mirror, berth.branch);
			expect(branches).toBe("");
		}),
	);

	it.live("preserves an unpushed branch when its worktree has vanished", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			const mirror = yield* commonDirectory(berth.path);
			yield* git(["-C", berth.path, "config", "user.email", "f@antumbra"]);
			yield* git(["-C", berth.path, "config", "user.name", "antumbra f"]);
			yield* Effect.sync(() => {
				writeFileSync(join(berth.path, "notes.md"), "unique work\n");
			});
			yield* git(["-C", berth.path, "add", "."]);
			yield* git(["-C", berth.path, "commit", "-m", "unique work"]);
			yield* Effect.sync(() => {
				rmSync(berth.path, { force: true, recursive: true });
			});
			const verdict = yield* runner.reclaim(berth);
			expect(verdict._tag).toBe("dirty");
			const branches = yield* branchListing(mirror, berth.branch);
			expect(branches).toContain(berth.branch);
		}),
	);

	it.live("reclaims a berth with ignored generated output", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			yield* Effect.sync(() => {
				mkdirSync(join(berth.path, "dist"));
				writeFileSync(join(berth.path, "dist", "bundle.js"), "generated\n");
			});
			const verdict = yield* runner.reclaim(berth);
			expect(verdict._tag).toBe("reclaimed");
			expect(existsSync(berth.path)).toBe(false);
		}),
	);

	it.live("refuses to reclaim uncommitted or unpushed work", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			yield* Effect.sync(() => {
				writeFileSync(join(berth.path, "notes.md"), "uncommitted\n");
			});
			const dirty = yield* runner.reclaim(berth);
			expect(dirty._tag).toBe("dirty");
			yield* git(["-C", berth.path, "config", "user.email", "f@antumbra"]);
			yield* git(["-C", berth.path, "config", "user.name", "antumbra f"]);
			yield* git(["-C", berth.path, "add", "."]);
			yield* git(["-C", berth.path, "commit", "-m", "wip"]);
			const unpushed = yield* runner.reclaim(berth);
			expect(unpushed._tag).toBe("dirty");
			expect(existsSync(berth.path)).toBe(true);
		}),
	);

	it.live("scrap converges even when the worktree vanished by hand", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [berthing(source)],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			yield* Effect.sync(() => {
				rmSync(berth.path, { force: true, recursive: true });
			});
			yield* runner.scrap(berth);
			expect(existsSync(berth.path)).toBe(false);
		}),
	);
});
