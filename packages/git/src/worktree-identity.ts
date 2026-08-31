import { Effect, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitOutputInvalid } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS } from "#timeouts.ts";

export interface WorktreeIdentity {
	readonly branch: string;
	readonly commonDirectory: string;
	readonly root: string;
}

const IdentityLines = Schema.Tuple([Schema.String, Schema.String, Schema.String]);

const invalidOutput = (detail: string) => new GitOutputInvalid({ detail, operation: "inspect-worktree" });

const decodeIdentity = (output: string) =>
	Schema.decodeUnknownEffect(IdentityLines)(output.trim().split("\n")).pipe(
		Effect.map(([root, branch, commonDirectory]) => ({
			branch,
			commonDirectory,
			root,
		})),
		Effect.mapError((cause) => invalidOutput(String(cause))),
	);

const decodeBranchExists = (branch: string, output: string) =>
	Schema.decodeUnknownEffect(Schema.Literals(["", branch]))(output.trim()).pipe(
		Effect.mapError((cause) => invalidOutput(String(cause))),
		Effect.map((listed) => listed !== ""),
	);

export const branchExists = (mirror: string, branch: string): Effect.Effect<boolean, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", mirror, "branch", "--list", "--format=%(refname:short)", branch],
		operation: "inspect-branch",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap((output) => decodeBranchExists(branch, output)));

export const inspectWorktreeIdentity = (path: string): Effect.Effect<WorktreeIdentity, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["-C", path, "rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD", "--git-common-dir"],
		operation: "inspect-worktree",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	}).pipe(Effect.flatMap(decodeIdentity));
