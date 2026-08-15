import type { BerthSite, RunnerFailure } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { git } from "#adapters/git.ts";

export const addWorktree = (
	mirror: string,
	path: string,
	branch: string,
	ref: string,
): Effect.Effect<void, RunnerFailure> =>
	git([
		"-C",
		mirror,
		"worktree",
		"add",
		"-b",
		branch,
		path,
		`origin/${ref}`,
	]).pipe(Effect.asVoid);

// why: staleness errs toward keeping — remote refs are read as-is, so a
// commit pushed but not yet fetched still counts as unpushed and the berth
// reads dirty, never the reverse.
export const isClean = (path: string): Effect.Effect<boolean, RunnerFailure> =>
	Effect.gen(function* () {
		const status = yield* git(["-C", path, "status", "--porcelain"]);
		if (status.trim() !== "") {
			return false;
		}
		const unpushed = yield* git([
			"-C",
			path,
			"rev-list",
			"--count",
			"HEAD",
			"--not",
			"--remotes",
		]);
		return unpushed.trim() === "0";
	});

export const removeWorktree = (
	mirror: string,
	site: BerthSite,
): Effect.Effect<void, RunnerFailure> =>
	Effect.gen(function* () {
		yield* git(["-C", mirror, "worktree", "remove", "--force", site.path]);
		yield* git(["-C", mirror, "branch", "-D", site.branch]);
	});

// why: expiry must converge even when a berth was half-deleted by hand —
// scrap prunes vanished paths and tolerates an already-gone branch.
export const scrapWorktree = (
	mirror: string,
	site: BerthSite,
): Effect.Effect<void, RunnerFailure> =>
	Effect.gen(function* () {
		yield* git(["-C", mirror, "worktree", "remove", "--force", site.path]).pipe(
			Effect.catchCause(() => git(["-C", mirror, "worktree", "prune"])),
		);
		yield* git(["-C", mirror, "branch", "-D", site.branch]).pipe(Effect.ignore);
	});
