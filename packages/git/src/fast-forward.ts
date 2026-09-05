import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import type { GitError } from "#errors.ts";
import { MUTATE_TIMEOUT_MILLIS } from "#timeouts.ts";

export const fastForwardWorktree = Effect.fn("Git.fastForwardWorktree")(function* (
	path: string,
	ref: string,
): Effect.fn.Return<void, GitError, ChildProcessSpawner.ChildProcessSpawner> {
	yield* runGit({
		args: ["-C", path, "merge", "--ff-only", `origin/${ref}`],
		operation: "fast-forward-worktree",
		timeoutMillis: MUTATE_TIMEOUT_MILLIS,
	});
});
