import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitPushRefused } from "#errors.ts";
import { REMOTE_TIMEOUT_MILLIS } from "#timeouts.ts";

const WORK_PREFIX = "work/";

export const pushBranch = (
	path: string,
	branch: string,
	preparedHeadSha: string,
): Effect.Effect<void, GitError | GitPushRefused, ChildProcessSpawner.ChildProcessSpawner> =>
	branch.startsWith(WORK_PREFIX)
		? runGit({
				args: ["-C", path, "push", "--force-with-lease", "origin", `${preparedHeadSha}:refs/heads/${branch}`],
				operation: "push-branch",
				timeoutMillis: REMOTE_TIMEOUT_MILLIS,
			}).pipe(Effect.asVoid)
		: new GitPushRefused({
				branch,
				detail: `only ${WORK_PREFIX} branches may be pushed`,
			});
