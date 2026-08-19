import { Effect, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitOutputInvalid } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS, MUTATE_TIMEOUT_MILLIS } from "#timeouts.ts";

export type WorktreeState =
	| { readonly _tag: "changed" }
	| { readonly _tag: "clean"; readonly unpushedCommits: number };

const CommitCount = Schema.FiniteFromString.check(
	Schema.isInt(),
	Schema.isGreaterThanOrEqualTo(0),
);

const decodeCount = (output: string) =>
	Schema.decodeUnknownEffect(CommitCount)(output.trim());

const countUnpushedCommits = (
	repository: string,
	revision: string,
	operation: "inspect-branch" | "inspect-worktree",
) =>
	Effect.gen(function* () {
		const output = yield* runGit({
			args: [
				"-C",
				repository,
				"rev-list",
				"--count",
				revision,
				"--not",
				"--remotes",
			],
			operation,
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		});
		return yield* decodeCount(output).pipe(
			Effect.mapError(
				(cause) =>
					new GitOutputInvalid({
						detail: String(cause),
						operation,
					}),
			),
		);
	});

export const countUnpushedBranchCommits = (
	mirror: string,
	branch: string,
): Effect.Effect<number, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	countUnpushedCommits(mirror, branch, "inspect-branch");

export const addWorktree = (
	mirror: string,
	path: string,
	branch: string,
	ref: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: [
			"-C",
			mirror,
			"worktree",
			"add",
			"-b",
			branch,
			path,
			`origin/${ref}`,
		],
		operation: "add-worktree",
		timeoutMillis: MUTATE_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const addExistingWorktree = (
	mirror: string,
	path: string,
	branch: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", mirror, "worktree", "add", path, branch],
		operation: "add-worktree",
		timeoutMillis: MUTATE_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const inspectWorktree = Effect.fn("git.inspectWorktree")(function* (
	path: string,
): Effect.fn.Return<
	WorktreeState,
	GitError,
	ChildProcessSpawner.ChildProcessSpawner
> {
	const status = yield* runGit({
		args: ["-C", path, "status", "--porcelain"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	if (status.trim() !== "") {
		return { _tag: "changed" as const };
	}
	const unpushedCommits = yield* countUnpushedCommits(
		path,
		"HEAD",
		"inspect-worktree",
	);
	return { _tag: "clean" as const, unpushedCommits };
});

export const removeWorktree = (
	mirror: string,
	path: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", mirror, "worktree", "remove", "--force", path],
		operation: "remove-worktree",
		timeoutMillis: MUTATE_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const pruneWorktrees = (
	mirror: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", mirror, "worktree", "prune"],
		operation: "prune-worktrees",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const deleteBranch = (
	mirror: string,
	branch: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", mirror, "branch", "-D", branch],
		operation: "delete-branch",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);
