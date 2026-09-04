import { Effect, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitOutputInvalid } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS } from "#timeouts.ts";

interface WorktreeChangeEvidence {
	readonly branch: string;
	readonly headSha: string;
	readonly root: string;
	readonly workingDiff: string;
	readonly workingTreeStatus: string;
}

const Identity = Schema.Tuple([Schema.String, Schema.String]);
const CommitSha = Schema.String.check(Schema.isPattern(/^[0-9a-f]+$/u));

const decodeIdentity = (output: string) =>
	Schema.decodeUnknownEffect(Identity)(output.trim().split("\n")).pipe(
		Effect.map(([root, branch]) => ({ branch, root })),
		Effect.mapError(
			(cause) =>
				new GitOutputInvalid({
					detail: String(cause),
					operation: "inspect-worktree",
				}),
		),
	);

export const captureWorktreeChange = Effect.fn("Git.captureWorktreeChange")(function* (
	path: string,
): Effect.fn.Return<WorktreeChangeEvidence, GitError, ChildProcessSpawner.ChildProcessSpawner> {
	const identity = yield* runGit({
		args: ["-C", path, "rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap(decodeIdentity));
	const headSha = yield* runGit({
		args: ["-C", path, "rev-parse", "--verify", "HEAD"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(
		Effect.flatMap((output) => Schema.decodeUnknownEffect(CommitSha)(output.trim())),
		Effect.mapError(
			(cause) =>
				new GitOutputInvalid({
					detail: String(cause),
					operation: "inspect-worktree",
				}),
		),
	);
	const workingDiff = yield* runGit({
		args: ["-C", path, "diff", "--binary", "HEAD", "--"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	const workingTreeStatus = yield* runGit({
		args: ["-C", path, "status", "--porcelain=v1", "--untracked-files=all"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	return { ...identity, headSha, workingDiff, workingTreeStatus };
});
