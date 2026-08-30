import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { AGENT, berthing, commonDirectory, git, head, makeHarbor, provision } from "#test/harbor.ts";

const advanceSource = (source: string) =>
	Effect.gen(function* () {
		yield* Effect.sync(() => {
			writeFileSync(join(source, "NEWS.md"), "newer\n");
		});
		yield* git(["-C", source, "add", "."]);
		yield* git(["-C", source, "commit", "-m", "newer"]);
		return yield* head(source);
	});

const commitInBerth = (path: string) =>
	Effect.gen(function* () {
		yield* git(["-C", path, "config", "user.email", "f@antumbra"]);
		yield* git(["-C", path, "config", "user.name", "antumbra f"]);
		yield* Effect.sync(() => {
			writeFileSync(join(path, "notes.md"), "unique work\n");
		});
		yield* git(["-C", path, "add", "."]);
		yield* git(["-C", path, "commit", "-m", "unique work"]);
		return yield* head(path);
	});

const berthed = Effect.gen(function* () {
	const { runner, source } = yield* makeHarbor;
	const plan = yield* provision(runner, {
		agentId: AGENT,
		repos: [berthing(source)],
	});
	const berth = plan.berths[0];
	if (berth === undefined) {
		return yield* Effect.die("no berth planned");
	}
	return { berth, plan, runner, source };
});

it.live("fast-forwards a clean surviving berth to the current origin ref", () =>
	Effect.gen(function* () {
		const { berth, plan, runner, source } = yield* berthed;
		const newer = yield* advanceSource(source);
		yield* runner.provision(plan);
		expect(yield* head(berth.path)).toBe(newer);
		const branch = yield* git(["-C", berth.path, "rev-parse", "--abbrev-ref", "HEAD"]);
		expect(branch.trim()).toBe(berth.branch);
	}),
);

it.live("fast-forwards a remounted berth to the current origin ref", () =>
	Effect.gen(function* () {
		const { berth, plan, runner, source } = yield* berthed;
		const mirror = yield* commonDirectory(berth.path);
		yield* git(["-C", mirror, "worktree", "remove", berth.path]);
		const newer = yield* advanceSource(source);
		yield* runner.provision(plan);
		expect(yield* head(berth.path)).toBe(newer);
	}),
);

it.live("leaves a berth with uncommitted changes on its base", () =>
	Effect.gen(function* () {
		const { berth, plan, runner, source } = yield* berthed;
		const base = yield* head(berth.path);
		yield* Effect.sync(() => {
			writeFileSync(join(berth.path, "README.md"), "in progress\n");
		});
		yield* advanceSource(source);
		yield* runner.provision(plan);
		expect(yield* head(berth.path)).toBe(base);
		const status = yield* git(["-C", berth.path, "status", "--porcelain"]);
		expect(status).toContain("README.md");
	}),
);

it.live("leaves a berth with its own commits on its base", () =>
	Effect.gen(function* () {
		const { berth, plan, runner, source } = yield* berthed;
		const unique = yield* commitInBerth(berth.path);
		yield* advanceSource(source);
		yield* runner.provision(plan);
		expect(yield* head(berth.path)).toBe(unique);
	}),
);
