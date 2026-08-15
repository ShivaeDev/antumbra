import { Effect } from "effect";
import type { ChildProcessSpawner } from "effect/unstable/process";
import { runGit } from "#command.ts";
import { type GitError, GitPushRefused } from "#errors.ts";
import { REMOTE_TIMEOUT_MILLIS } from "#timeouts.ts";

const WORK_PREFIX = "work/";

// why: the rail lives in this package so no caller anywhere can push another
// ref through Antumbra. An agent's own branch is the only thing the system may
// move on a remote, and the refusal happens before git is spawned.
//
// why: one explicit refspec, never a matching push, never --all or --mirror,
// and --force-with-lease rather than --force — a work branch is rebased as a
// matter of course, but overwriting work someone else pushed to it is not
// something this system gets to do silently.
export const pushBranch = (
	path: string,
	branch: string,
): Effect.Effect<
	void,
	GitError | GitPushRefused,
	ChildProcessSpawner.ChildProcessSpawner
> =>
	branch.startsWith(WORK_PREFIX)
		? runGit({
				args: [
					"-C",
					path,
					"push",
					"--force-with-lease",
					"origin",
					`HEAD:refs/heads/${branch}`,
				],
				operation: "push-branch",
				timeoutMillis: REMOTE_TIMEOUT_MILLIS,
			}).pipe(Effect.asVoid)
		: new GitPushRefused({
				branch,
				detail: `only ${WORK_PREFIX} branches may be pushed`,
			});
