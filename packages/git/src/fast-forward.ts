import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import type { GitError } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS, MUTATE_TIMEOUT_MILLIS } from "#timeouts.ts";

const NOT_AN_ANCESTOR = 1;

const isAncestor = (path: string, target: string) =>
	runGit({
		args: ["-C", path, "merge-base", "--is-ancestor", "HEAD", target],
		operation: "fast-forward-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(
		Effect.as(true),
		Effect.catchIf(
			(failure) => failure._tag === "GitCommandFailed" && failure.exitCode === NOT_AN_ANCESTOR,
			() => Effect.succeed(false),
		),
	);

export const fastForwardWorktree = Effect.fn("git.fastForwardWorktree")(function* (
	path: string,
	ref: string,
): Effect.fn.Return<void, GitError, ChildProcessSpawner.ChildProcessSpawner> {
	const target = `origin/${ref}`;
	if (!(yield* isAncestor(path, target))) {
		return;
	}
	yield* runGit({
		args: ["-C", path, "merge", "--ff-only", target],
		operation: "fast-forward-worktree",
		timeoutMillis: MUTATE_TIMEOUT_MILLIS,
	});
});
