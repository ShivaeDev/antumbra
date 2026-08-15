import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GitAuthRequired } from "@antumbra/git";
import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { toRunnerError } from "#git-runtime.ts";
import { makeLocalRunner } from "#local.ts";

const AGENT = "0123456789abcdef";

const git = (args: ReadonlyArray<string>): Effect.Effect<string> =>
	Effect.sync(() => execFileSync("git", args, { encoding: "utf8" }));

const acquireTempRoot = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-runner-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const makeSourceRepo = (root: string) =>
	Effect.gen(function* () {
		const source = join(root, "source");
		yield* git(["init", "-b", "main", source]);
		yield* git(["-C", source, "config", "user.email", "fixture@antumbra"]);
		yield* git(["-C", source, "config", "user.name", "antumbra fixture"]);
		yield* Effect.sync(() => {
			writeFileSync(join(source, ".gitignore"), "dist/\n");
			writeFileSync(join(source, "README.md"), "ahoy\n");
		});
		yield* git(["-C", source, "add", "."]);
		yield* git(["-C", source, "commit", "-m", "init"]);
		return source;
	});

const makeHarbor = Effect.gen(function* () {
	const root = yield* acquireTempRoot;
	const source = yield* makeSourceRepo(root);
	const runner = makeLocalRunner({
		berthsRoot: join(root, "berths"),
		reposRoot: join(root, "repos"),
	});
	return { root, runner, source };
});

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

	it.live("provisions a worktree on a work branch from the mirror", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* runner.provision({
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
			const moorage = yield* runner.provision({ agentId: AGENT, repos: [] });
			expect(moorage.berths).toHaveLength(0);
			expect(existsSync(moorage.root)).toBe(true);
		}),
	);

	it.live("reclaims a clean berth and removes worktree and branch", () =>
		Effect.gen(function* () {
			const { runner, source } = yield* makeHarbor;
			const moorage = yield* runner.provision({
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
			const moorage = yield* runner.provision({
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
			const moorage = yield* runner.provision({
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
			const moorage = yield* runner.provision({
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
