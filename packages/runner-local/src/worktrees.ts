import {
	addWorktree as addGitWorktree,
	deleteBranch,
	inspectWorktree,
	pruneWorktrees,
	removeWorktree as removeGitWorktree,
} from "@antumbra/git";
import type { BerthSite, RunnerError } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { runGit } from "#git-runtime.ts";

export const addWorktree = (
	mirror: string,
	path: string,
	branch: string,
	ref: string,
): Effect.Effect<void, RunnerError> =>
	runGit(addGitWorktree(mirror, path, branch, ref));

// why: staleness errs toward keeping — remote refs are read as-is, so a
// commit pushed but not yet fetched still counts as unpushed and the berth
// reads dirty, never the reverse.
export const isClean = (path: string): Effect.Effect<boolean, RunnerError> =>
	Effect.gen(function* () {
		const state = yield* runGit(inspectWorktree(path));
		return state._tag === "clean" && state.unpushedCommits === 0;
	});

export const removeWorktree = (
	mirror: string,
	site: BerthSite,
): Effect.Effect<void, RunnerError> =>
	Effect.gen(function* () {
		yield* runGit(removeGitWorktree(mirror, site.path));
		yield* runGit(deleteBranch(mirror, site.branch));
	});

// why: expiry must converge even when a berth was half-deleted by hand —
// scrap prunes vanished paths and tolerates an already-gone branch.
export const scrapWorktree = (
	mirror: string,
	site: BerthSite,
): Effect.Effect<void, RunnerError> =>
	Effect.gen(function* () {
		yield* runGit(removeGitWorktree(mirror, site.path)).pipe(
			Effect.catchCause(() => runGit(pruneWorktrees(mirror))),
		);
		yield* runGit(deleteBranch(mirror, site.branch)).pipe(Effect.ignore);
	});
