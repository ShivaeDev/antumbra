import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import type { GitError } from "#errors.ts";

const REMOTE_TIMEOUT_MILLIS = 30 * 60 * 1_000;
const INSPECT_TIMEOUT_MILLIS = 3 * 60 * 1_000;

export const cloneMirror = (
	source: string,
	destination: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	runGit({
		args: ["clone", "--bare", source, destination],
		operation: "clone-mirror",
		timeoutMillis: REMOTE_TIMEOUT_MILLIS,
	}).pipe(Effect.asVoid);

export const refreshMirror = (
	path: string,
): Effect.Effect<void, GitError, ChildProcessSpawner.ChildProcessSpawner> =>
	Effect.gen(function* () {
		// why: a bare clone lacks branch refs, and repeating the refspec heals a
		// clone interrupted between creation and its first refresh.
		yield* runGit({
			args: [
				"-C",
				path,
				"config",
				"remote.origin.fetch",
				"+refs/heads/*:refs/remotes/origin/*",
			],
			operation: "refresh-mirror",
			timeoutMillis: INSPECT_TIMEOUT_MILLIS,
		});
		yield* runGit({
			args: ["-C", path, "fetch", "--quiet", "origin"],
			operation: "refresh-mirror",
			timeoutMillis: REMOTE_TIMEOUT_MILLIS,
		});
	});
