import { Effect } from "effect";
import { fastForwardWorktree } from "#fast-forward.ts";
import { refreshMirror } from "#mirrors.ts";
import type { GitProcess } from "#process.ts";
import { runGit } from "#resources/git-runtime.ts";
import type { Machine } from "#resources/machine.ts";
import type { BerthPlan } from "#resources/model.ts";
import { inspectWorktree } from "#worktrees.ts";

export const refreshBerth = Effect.fn("RunnerLocal.refreshBerth")(
	(mirror: string, berth: BerthPlan): Effect.Effect<void, never, GitProcess | Machine> =>
		Effect.catch(
			Effect.gen(function* () {
				yield* runGit(refreshMirror(mirror));
				const state = yield* runGit(inspectWorktree(berth.path));
				if (state._tag !== "clean") {
					return;
				}
				yield* runGit(fastForwardWorktree(berth.path, berth.ref));
			}),
			(failure) => Effect.logWarning("a berth could not be brought up to date", { path: berth.path }, failure),
		),
);
