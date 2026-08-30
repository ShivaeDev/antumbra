import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeHostBerth, ChangeHostRepo } from "@antumbra/plugin-api";
import { Effect } from "effect";

export const BRANCH = "work/ab12cd34/antumbra";

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
		stdio: ["ignore", "pipe", "pipe"],
	});

export interface Berthed {
	readonly berth: ChangeHostBerth;
	readonly headSha: string;
	readonly remote: string;
	readonly repo: ChangeHostRepo;
	readonly root: string;
}

// why: the push half of opening a change is real — a temporary bare repo
// standing in for the remote, a mirror, and a worktree on a work branch — so
// the test proves the branch reaches the remote rather than proving that a
// function named push was called.
const cut = (root: string): Berthed => {
	const seed = join(root, "seed");
	const remote = join(root, "remote.git");
	const mirror = join(root, "mirror.git");
	const path = join(root, "berth");
	git("init", "-q", "-b", "main", seed);
	writeFileSync(join(seed, "README.md"), "ahoy\n");
	git("-C", seed, "add", ".");
	git("-C", seed, "commit", "-qm", "init");
	git("clone", "-q", "--bare", seed, remote);
	git("clone", "-q", "--bare", remote, mirror);
	git("-C", mirror, "config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*");
	git("-C", mirror, "fetch", "-q", "origin");
	git("-C", mirror, "worktree", "add", "-b", BRANCH, path, "origin/main");
	writeFileSync(join(path, "notes.md"), "sounded three fathoms\n");
	git("-C", path, "add", ".");
	git("-C", path, "commit", "-qm", "sound the shallows");
	return {
		berth: { branch: BRANCH, path },
		headSha: git("-C", path, "rev-parse", "HEAD").trim(),
		remote,
		repo: {
			defaultRef: "main",
			id: "repo-antumbra",
			name: "antumbra",
			source: "https://github.com/ShivaeDev/antumbra.git",
		},
		root,
	};
};

export const advanceBerth = (path: string): void => {
	writeFileSync(join(path, "later.md"), "charted after submission\n");
	git("-C", path, "add", ".");
	git("-C", path, "commit", "-qm", "chart later work");
};

export const refSha = (repo: string, ref: string): string => git("-C", repo, "rev-parse", ref).trim();

export const berthed = Effect.acquireRelease(
	Effect.sync(() => cut(mkdtempSync(join(tmpdir(), "antumbra-berth-")))),
	(site) => Effect.sync(() => rmSync(site.root, { force: true, recursive: true })),
);

export const remoteBranches = (remote: string): ReadonlyArray<string> =>
	git("-C", remote, "for-each-ref", "--format=%(refname)", "refs/heads")
		.split("\n")
		.filter((line) => line !== "");
