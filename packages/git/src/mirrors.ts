import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import type { GitError } from "#errors.ts";
import { INSPECT_TIMEOUT_MILLIS, REMOTE_TIMEOUT_MILLIS } from "#timeouts.ts";

export const cloneMirror = (source: string, destination: string): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["clone", "--bare", source, destination],
		operation: "clone-mirror",
		timeoutMillis: REMOTE_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const refreshMirror = Effect.fn("git.refreshMirror")(function* (
	path: string,
): Effect.fn.Return<void, GitError, ChildProcessSpawner.ChildProcessSpawner> {
	yield* runGit({
		args: ["-C", path, "config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"],
		operation: "refresh-mirror",
		timeoutMillis: INSPECT_TIMEOUT_MILLIS,
	});
	yield* runGit({
		args: ["-C", path, "fetch", "--quiet", "origin"],
		operation: "refresh-mirror",
		timeoutMillis: REMOTE_TIMEOUT_MILLIS,
	});
});
