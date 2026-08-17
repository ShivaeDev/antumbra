import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeServices } from "@effect/platform-node";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import {
	addWorktree,
	cloneMirror,
	inspectWorktree,
	pushBranch,
	refreshMirror,
} from "#index.ts";

const BRANCH = "work/ab12cd34/slug";

const tempRoot = Effect.acquireRelease(
	Effect.sync(() => mkdtempSync(join(tmpdir(), "antumbra-push-"))),
	(root) => Effect.sync(() => rmSync(root, { force: true, recursive: true })),
);

const git = (...args: ReadonlyArray<string>): string =>
	execFileSync("git", [...args], {
		encoding: "utf8",
		env: {
			GIT_AUTHOR_EMAIL: "fixture@antumbra",
			GIT_AUTHOR_NAME: "fixture",
			GIT_COMMITTER_EMAIL: "fixture@antumbra",
			GIT_COMMITTER_NAME: "fixture",
			PATH: "/usr/bin:/bin:/usr/local/bin",
		},
	});

const sha = (repo: string, ref: string): string =>
	git("-C", repo, "rev-parse", ref).trim();

const seedRemote = (root: string): string => {
	const seed = join(root, "seed");
	const remote = join(root, "remote.git");
	git("init", "-q", "-b", "main", seed);
	writeFileSync(join(seed, "README.md"), "ahoy\n");
	git("-C", seed, "add", ".");
	git("-C", seed, "commit", "-qm", "init");
	git("clone", "-q", "--bare", seed, remote);
	return remote;
};

const commitInto = (worktree: string, name: string, message: string): void => {
	writeFileSync(join(worktree, name), `${message}\n`);
	git("-C", worktree, "add", ".");
	git("-C", worktree, "commit", "-qm", message);
};

// why: the refusal must land before a process exists, so the spawner this test
// provides has no answer at all — reaching it is the failure.
const forbiddenSpawner = Layer.succeed(
	ChildProcessSpawner.ChildProcessSpawner,
	ChildProcessSpawner.make(() =>
		Effect.die("git was spawned for a bad branch"),
	),
);

describe("pushing a work branch", () => {
	it.live("moves one branch and leaves the trunk alone", () =>
		Effect.gen(function* () {
			const root = yield* tempRoot;
			const remote = seedRemote(root);
			const mirror = join(root, "mirror.git");
			const worktree = join(root, "berth");
			const trunk = sha(remote, "refs/heads/main");

			yield* cloneMirror(remote, mirror);
			yield* refreshMirror(mirror);
			yield* addWorktree(mirror, worktree, BRANCH, "main");
			commitInto(worktree, "notes.md", "sounded three fathoms");
			yield* pushBranch(worktree, BRANCH, sha(worktree, "HEAD"));

			expect(sha(remote, `refs/heads/${BRANCH}`)).toBe(sha(worktree, "HEAD"));
			expect(sha(remote, "refs/heads/main")).toBe(trunk);
			// why: the push writes the mirror's remote-tracking ref, so a berth is
			// clean the moment its work is on the remote — no fetch in between.
			expect(yield* inspectWorktree(worktree)).toEqual({
				_tag: "clean",
				unpushedCommits: 0,
			});

			git("-C", worktree, "commit", "-q", "--amend", "-m", "re-sounded");
			yield* pushBranch(worktree, BRANCH, sha(worktree, "HEAD"));
			expect(sha(remote, `refs/heads/${BRANCH}`)).toBe(sha(worktree, "HEAD"));
		}).pipe(Effect.provide(NodeServices.layer)),
	);

	it.live("pushes the prepared commit when the berth advances afterward", () =>
		Effect.gen(function* () {
			const root = yield* tempRoot;
			const remote = seedRemote(root);
			const mirror = join(root, "mirror.git");
			const worktree = join(root, "berth");
			yield* cloneMirror(remote, mirror);
			yield* refreshMirror(mirror);
			yield* addWorktree(mirror, worktree, BRANCH, "main");
			commitInto(worktree, "prepared.md", "prepared snapshot");
			const preparedHeadSha = sha(worktree, "HEAD");
			commitInto(worktree, "later.md", "later work");

			yield* pushBranch(worktree, BRANCH, preparedHeadSha);

			expect(sha(remote, `refs/heads/${BRANCH}`)).toBe(preparedHeadSha);
			expect(sha(worktree, "HEAD")).not.toBe(preparedHeadSha);
		}).pipe(Effect.provide(NodeServices.layer)),
	);

	it.effect("refuses any branch outside work/ without spawning git", () =>
		Effect.gen(function* () {
			const refused = yield* Effect.flip(
				pushBranch("/berth", "main", "deadbeef"),
			);
			expect(refused._tag).toBe("GitPushRefused");
			expect(refused.message).toContain("main");
		}).pipe(Effect.provide(forbiddenSpawner)),
	);
});
