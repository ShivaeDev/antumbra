import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	AGENT,
	git,
	makeHarbor,
	makeSourceRepo,
	provision,
} from "#test/harbor.ts";

it.live("provisions a worktree on a work branch from the mirror", () =>
	Effect.gen(function* () {
		const { runner, source } = yield* makeHarbor;
		const moorage = yield* provision(runner, {
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		expect(moorage.root.endsWith(AGENT)).toBe(true);
		expect(moorage.berths).toHaveLength(1);
		const berth = moorage.berths[0];
		expect(berth?.slug).toBe("source");
		expect(berth?.branch).toBe("work/01234567/source");
		expect(existsSync(join(moorage.root, "source", "README.md"))).toBe(true);
		const head = yield* git([
			"-C",
			join(moorage.root, "source"),
			"rev-parse",
			"--abbrev-ref",
			"HEAD",
		]);
		expect(head.trim()).toBe("work/01234567/source");
	}),
);

it.live("provisions a bare scratch root when no repos are asked for", () =>
	Effect.gen(function* () {
		const { runner } = yield* makeHarbor;
		const moorage = yield* provision(runner, { agentId: AGENT, repos: [] });
		expect(moorage.berths).toHaveLength(0);
		expect(existsSync(moorage.root)).toBe(true);
	}),
);

it.live("reconciles the same provision request twice", () =>
	Effect.gen(function* () {
		const { runner, source } = yield* makeHarbor;
		const request = {
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		};
		const first = yield* provision(runner, request);
		yield* Effect.sync(() => rmSync(source, { recursive: true }));
		const second = yield* provision(runner, request);
		expect(second).toEqual(first);
	}),
);

it.live("creates only the missing berth after partial provision", () =>
	Effect.gen(function* () {
		const { root, runner, source } = yield* makeHarbor;
		const secondSource = yield* makeSourceRepo(join(root, "second"));
		const first = yield* provision(runner, {
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		const reconciled = yield* provision(runner, {
			agentId: AGENT,
			repos: [
				{ ref: "main", source },
				{ ref: "main", source: secondSource },
			],
		});
		expect(reconciled.berths[0]).toEqual(first.berths[0]);
		expect(existsSync(reconciled.berths[1]?.path ?? "")).toBe(true);
	}),
);

it.live("fails closed when the planned path has another branch identity", () =>
	Effect.gen(function* () {
		const { runner, source } = yield* makeHarbor;
		const plan = runner.plan({
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		const berth = plan.berths[0];
		if (berth === undefined) {
			return expect.unreachable("no berth planned");
		}
		yield* git(["init", "-b", "intruder", berth.path]);
		const conflict = yield* Effect.flip(runner.provision(plan));
		expect(conflict._tag).toBe("RunnerProvisionConflict");
	}),
);

it.live("fails closed on a same-branch worktree from another source", () =>
	Effect.gen(function* () {
		const { root, runner, source } = yield* makeHarbor;
		yield* runner.provision(
			runner.plan({
				agentId: "mirror-seed",
				repos: [{ ref: "main", source }],
			}),
		);
		const wrongSource = yield* makeSourceRepo(join(root, "wrong"));
		const plan = runner.plan({
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		const berth = plan.berths[0];
		if (berth === undefined) {
			return expect.unreachable("no berth planned");
		}
		const wrongMirror = join(root, "wrong.git");
		yield* git(["clone", "--bare", wrongSource, wrongMirror]);
		yield* git([
			"-C",
			wrongMirror,
			"config",
			"remote.origin.fetch",
			"+refs/heads/*:refs/remotes/origin/*",
		]);
		yield* git(["-C", wrongMirror, "fetch", "origin"]);
		yield* Effect.sync(() => mkdirSync(plan.root, { recursive: true }));
		yield* git([
			"-C",
			wrongMirror,
			"worktree",
			"add",
			"-b",
			berth.branch,
			berth.path,
			"origin/main",
		]);
		const conflict = yield* Effect.flip(runner.provision(plan));
		expect(conflict._tag).toBe("RunnerProvisionConflict");
	}),
);

it.live("restores a planned path when its branch residue remains", () =>
	Effect.gen(function* () {
		const { runner, source } = yield* makeHarbor;
		const plan = yield* provision(runner, {
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		const berth = plan.berths[0];
		if (berth === undefined) {
			return expect.unreachable("no berth planned");
		}
		const mirror = (yield* git([
			"-C",
			berth.path,
			"rev-parse",
			"--git-common-dir",
		])).trim();
		yield* git(["-C", mirror, "worktree", "remove", berth.path]);
		expect(existsSync(berth.path)).toBe(false);
		expect(
			(yield* git(["-C", mirror, "branch", "--list", berth.branch])).trim(),
		).toBe(berth.branch);
		yield* Effect.sync(() => rmSync(source, { recursive: true }));
		yield* runner.provision(plan);
		expect(existsSync(berth.path)).toBe(true);
		expect(
			(yield* git([
				"-C",
				berth.path,
				"rev-parse",
				"--abbrev-ref",
				"HEAD",
			])).trim(),
		).toBe(berth.branch);
	}),
);

it.live("prunes a stale registration before remounting its exact branch", () =>
	Effect.gen(function* () {
		const { runner, source } = yield* makeHarbor;
		const plan = yield* provision(runner, {
			agentId: AGENT,
			repos: [{ ref: "main", source }],
		});
		const berth = plan.berths[0];
		if (berth === undefined) {
			return expect.unreachable("no berth planned");
		}
		const mirror = (yield* git([
			"-C",
			berth.path,
			"rev-parse",
			"--git-common-dir",
		])).trim();
		yield* Effect.sync(() => {
			rmSync(berth.path, { recursive: true });
			rmSync(source, { recursive: true });
		});
		yield* runner.provision(plan);
		expect(
			(yield* git([
				"-C",
				berth.path,
				"rev-parse",
				"--abbrev-ref",
				"HEAD",
			])).trim(),
		).toBe(berth.branch);
		expect(
			(yield* git(["-C", berth.path, "rev-parse", "--git-common-dir"])).trim(),
		).toBe(mirror);
	}),
);
