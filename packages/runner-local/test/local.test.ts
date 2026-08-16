import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GitAuthRequired } from "@antumbra/git";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { toRunnerError } from "#git-runtime.ts";
import { AGENT, git, makeHarbor, provision } from "#test/harbor.ts";

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
				repos: [{ ref: "main", source }],
			});
			const berth = moorage.berths[0];
			if (berth === undefined) {
				return expect.unreachable("no berth provisioned");
			}
			const verdict = yield* runner.reclaim(berth);
			expect(verdict._tag).toBe("reclaimed");
			expect(existsSync(berth.path)).toBe(false);
		}),
	);

	it.live("reclaims a berth with ignored generated output", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* provision(runner, {
				agentId: AGENT,
				repos: [{ ref: "main", source }],
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
				repos: [{ ref: "main", source }],
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
				repos: [{ ref: "main", source }],
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
