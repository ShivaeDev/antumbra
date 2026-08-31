import {
	addExistingWorktree,
	addWorktree as addGitWorktree,
	branchExists,
	countUnpushedBranchCommits,
	deleteBranch,
	inspectWorktree,
	inspectWorktreeIdentity,
	pruneWorktrees,
	removeWorktree as removeGitWorktree,
} from "@antumbra/git";
import { type BerthPlan, type BerthSite, type ReclaimVerdict, type RunnerError, RunnerProvisionConflict } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { canonicalPath } from "#adapters/fs.ts";
import { runGit } from "#git-runtime.ts";

export const verifyWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<void, RunnerError> =>
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

export const remountWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<boolean, RunnerError> =>
	Effect.gen(function* () {
		if (!(yield* runGit(branchExists(mirror, berth.branch)))) {
			return false;
		}
		// why: a vanished path can remain registered as the branch's worktree;
		// prune only missing registrations before attaching that same branch.
		yield* runGit(pruneWorktrees(mirror));
		yield* runGit(addExistingWorktree(mirror, berth.path, berth.branch));
		yield* verifyWorktree(mirror, berth);
		return true;
	});

export const createWorktree = (mirror: string, berth: BerthPlan): Effect.Effect<void, RunnerError> =>
	runGit(addGitWorktree(mirror, berth.path, berth.branch, berth.ref)).pipe(Effect.andThen(verifyWorktree(mirror, berth)));

// why: staleness errs toward keeping — remote refs are read as-is, so a
// commit pushed but not yet fetched still counts as unpushed and the berth
// reads dirty, never the reverse.
export const isClean = (path: string): Effect.Effect<boolean, RunnerError> =>
	Effect.gen(function* () {
		const state = yield* runGit(inspectWorktree(path));
		return state._tag === "clean" && state.unpushedCommits === 0;
	});

// why: a prior reclaim may remove the worktree before branch deletion fails;
// the surviving branch is then the only remaining unique-work evidence.
export const reclaimMissingWorktree = (mirror: string, site: BerthSite): Effect.Effect<ReclaimVerdict, RunnerError> =>
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

export const removeWorktree = (mirror: string, site: BerthSite): Effect.Effect<void, RunnerError> =>
	Effect.gen(function* () {
		yield* runGit(removeGitWorktree(mirror, site.path));
		yield* runGit(deleteBranch(mirror, site.branch));
	});
