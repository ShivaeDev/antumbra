import { Effect } from "effect";
import { captureWorktreeChange } from "#change-evidence.ts";
import type { GitProcess } from "#process.ts";
import { runGit } from "#resources/git-runtime.ts";
import type { Machine } from "#resources/machine.ts";
import { canonicalPath } from "#resources/machine.ts";
import { type BerthSite, type ChangePreparationEvidence, type RunnerError, RunnerProvisionConflict } from "#resources/model.ts";

export const captureChange = (berth: BerthSite): Effect.Effect<ChangePreparationEvidence, RunnerError, GitProcess | Machine> =>
	Effect.gen(function* () {
		const evidence = yield* runGit(captureWorktreeChange(berth.path));
		const actualRoot = yield* canonicalPath(evidence.root);
		const expectedRoot = yield* canonicalPath(berth.path);
		if (actualRoot !== expectedRoot) {
			return yield* new RunnerProvisionConflict({ detail: `${berth.path} is a worktree of ${actualRoot}, expected ${expectedRoot}`, tag: "local" });
		}
		return {
			branch: evidence.branch,
			headSha: evidence.headSha,
			workingDiff: evidence.workingDiff,
			workingTreeStatus: evidence.workingTreeStatus,
			worktreePath: berth.path,
		};
	});
