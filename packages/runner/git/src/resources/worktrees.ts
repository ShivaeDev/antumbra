import { Effect } from "effect";
import type { GitProcess } from "#process.ts";
import { runGit } from "#resources/git-runtime.ts";
import type { Machine } from "#resources/machine.ts";
import { canonicalPath } from "#resources/machine.ts";
import { type BerthPlan, type BerthSite, type ReclaimVerdict, type RunnerError, RunnerProvisionConflict } from "#resources/model.ts";
import { branchExists, inspectWorktreeIdentity } from "#worktree-identity.ts";
import {
	addExistingWorktree,
	addWorktree as addGitWorktree,
	countUnpushedBranchCommits,
	deleteBranch,
	inspectWorktree,
	pruneWorktrees,
	removeWorktree as removeGitWorktree,
} from "#worktrees.ts";

export const verifyWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<void, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		const identity = yield* runGit(inspectWorktreeIdentity(berth.path)).pipe(
			Effect.catchTag("RunnerFailure", (failure) =>
				Effect.fail(
					new RunnerProvisionConflict({
						detail: `${berth.path} is not the planned worktree: ${failure.detail}`,
						tag: "local",
					}),
				),
			),
		);
		const actualRoot = yield* canonicalPath(identity.root);
		const actualMirror = yield* canonicalPath(identity.commonDirectory);
		const plannedRoot = yield* canonicalPath(berth.path);
		const plannedMirror = yield* canonicalPath(mirror).pipe(
			Effect.catchTag("RunnerFailure", (failure) =>
				Effect.fail(
					new RunnerProvisionConflict({
						detail: `planned mirror ${mirror} is unavailable: ${failure.detail}`,
						tag: "local",
					}),
				),
			),
		);
		if (identity.branch !== berth.branch || actualRoot !== plannedRoot || actualMirror !== plannedMirror) {
			return yield* new RunnerProvisionConflict({
				detail: `${berth.path} is ${identity.branch} from ${actualMirror}, expected ${berth.branch} from ${plannedMirror}`,
				tag: "local",
			});
		}
	});

export const remountWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<boolean, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		if (!(yield* runGit(branchExists(mirror, berth.branch)))) {
			return false;
		}
		yield* runGit(pruneWorktrees(mirror));
		yield* runGit(addExistingWorktree(mirror, berth.path, berth.branch));
		yield* verifyWorktree(mirror, berth);
		return true;
	});

export const createWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<void, RunnerError, GitProcess | Machine> =>
	runGit(addGitWorktree(mirror, berth.path, berth.branch, berth.ref)).pipe(Effect.andThen(verifyWorktree(mirror, berth)));

// A stale remote ref can only overcount unpushed commits, so reclaim remains conservative.
export const isClean = (path: string): Effect.Effect<boolean, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		const state = yield* runGit(inspectWorktree(path));
		return state._tag === "clean" && state.unpushedCommits === 0;
	});

export const reclaimMissingWorktree = (mirror: string, site: BerthSite): Effect.Effect<ReclaimVerdict, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		if (!(yield* runGit(branchExists(mirror, site.branch)))) {
			yield* runGit(pruneWorktrees(mirror));
			return { _tag: "reclaimed" as const };
		}
		if ((yield* runGit(countUnpushedBranchCommits(mirror, site.branch))) > 0) {
			return { _tag: "dirty" as const };
		}
		yield* runGit(pruneWorktrees(mirror));
		yield* runGit(deleteBranch(mirror, site.branch));
		return { _tag: "reclaimed" as const };
	});

export const removeWorktree = (mirror: string, site: BerthSite): Effect.Effect<void, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		yield* runGit(removeGitWorktree(mirror, site.path));
		yield* runGit(deleteBranch(mirror, site.branch));
	});
