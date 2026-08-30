import {
	fastForwardWorktree,
	inspectWorktree,
	refreshMirror,
} from "@antumbra/git";
import type { BerthPlan } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { runGit } from "#git-runtime.ts";

// why: a berth that outlives its session keeps the base it was cut from, so
// the source is asked for a newer one — but only when nothing local can be
// lost, and never as a condition of provisioning: a stale berth is still a
// valid berth, and a source that cannot be reached costs one warning.
export const refreshBerth = Effect.fn("runnerLocal.refreshBerth")(
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
			(failure) =>
				Effect.logWarning(
					"a berth could not be brought up to date",
					{ path: berth.path },
					failure,
				),
		),
);
