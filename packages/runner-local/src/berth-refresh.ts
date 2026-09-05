import { fastForwardWorktree, inspectWorktree, refreshMirror } from "@antumbra/git";
import type { BerthPlan } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { runGit } from "#git-runtime.ts";

export const refreshBerth = Effect.fn("RunnerLocal.refreshBerth")(
	(mirror: string, berth: BerthPlan): Effect.Effect<void> =>
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
