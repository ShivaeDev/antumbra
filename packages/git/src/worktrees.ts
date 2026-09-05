import { Effect, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitOutputInvalid } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS, MUTATE_TIMEOUT_MILLIS } from "#timeouts.ts";

type WorktreeState = { readonly _tag: "changed" } | { readonly _tag: "clean"; readonly unpushedCommits: number };

const CommitCount = Schema.FiniteFromString.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0));

const countUnpushedCommits = Effect.fnUntraced(function* (repository: string, revision: string, operation: "inspect-branch" | "inspect-worktree") {
	const output = yield* runGit({
		args: ["-C", repository, "rev-list", "--count", revision, "--not", "--remotes"],
		operation,
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	return yield* Schema.decodeUnknownEffect(CommitCount)(output.trim()).pipe(
		Effect.mapError(
			(cause) =>
				new GitOutputInvalid({
					detail: String(cause),
					operation,
				}),
		),
	);
});

export const countUnpushedBranchCommits = Effect.fn("Git.countUnpushedBranchCommits")(
	(mirror: string, branch: string): Effect.Effect<number, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		countUnpushedCommits(mirror, branch, "inspect-branch"),
);

export const addWorktree = Effect.fn("Git.addWorktree")(
	(mirror: string, path: string, branch: string, ref: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		runGit({
			args: ["-C", mirror, "worktree", "add", "-b", branch, path, `origin/${ref}`],
			operation: "add-worktree",
			timeoutMillis: MUTATE_TIMEOUT_MILLIS,
		}).pipe(Effect.asVoid),
);

export const addExistingWorktree = Effect.fn("Git.addExistingWorktree")(
	(mirror: string, path: string, branch: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		runGit({
			args: ["-C", mirror, "worktree", "add", path, branch],
			operation: "add-worktree",
			timeoutMillis: MUTATE_TIMEOUT_MILLIS,
		}).pipe(Effect.asVoid),
);

export const inspectWorktree = Effect.fn("Git.inspectWorktree")(function* (
	path: string,
): Effect.fn.Return<WorktreeState, GitError, ChildProcessSpawner.ChildProcessSpawner> {
	const status = yield* runGit({
		args: ["-C", path, "status", "--porcelain"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	if (status.trim() !== "") {
		return { _tag: "changed" as const };
	}
	const unpushedCommits = yield* countUnpushedCommits(path, "HEAD", "inspect-worktree");
	return { _tag: "clean" as const, unpushedCommits };
});

export const removeWorktree = Effect.fn("Git.removeWorktree")(
	(mirror: string, path: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		runGit({
			args: ["-C", mirror, "worktree", "remove", "--force", path],
			operation: "remove-worktree",
			timeoutMillis: MUTATE_TIMEOUT_MILLIS,
		}).pipe(Effect.asVoid),
);

export const pruneWorktrees = Effect.fn("Git.pruneWorktrees")(
	(mirror: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		runGit({
			args: ["-C", mirror, "worktree", "prune"],
			operation: "prune-worktrees",
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		}).pipe(Effect.asVoid),
);

export const deleteBranch = Effect.fn("Git.deleteBranch")(
	(mirror: string, branch: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
		runGit({
			args: ["-C", mirror, "branch", "-D", branch],
			operation: "delete-branch",
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		}).pipe(Effect.asVoid),
);
