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

export const inspectWorktree = (
	path: string,
): Effect.Effect<
	WorktreeState,
	GitError,
	ChildProcessSpawner.ChildProcessSpawner
> =>
	Effect.gen(function* () {
		const status = yield* runGit({
			args: ["-C", path, "status", "--porcelain"],
			operation: "inspect-worktree",
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		});
		if (status.trim() !== "") {
			return { _tag: "changed" as const };
		}
		const unpushed = yield* runGit({
			args: ["-C", path, "rev-list", "--count", "HEAD", "--not", "--remotes"],
			operation: "inspect-worktree",
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		});
		const unpushedCommits = yield* decodeCount(unpushed).pipe(
			Effect.mapError(
				(cause) =>
					new GitOutputInvalid({
						detail: String(cause),
						operation: "inspect-worktree",
					}),
			),
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
