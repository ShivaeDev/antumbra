import { captureWorktreeChange } from "@antumbra/git";
import {
	type BerthSite,
	type ChangePreparationEvidence,
	type RunnerError,
	RunnerProvisionConflict,
} from "@antumbra/plugin-api";
import { Effect } from "effect";
import { canonicalPath } from "#adapters/fs.ts";
import { runGit } from "#git-runtime.ts";

export const captureChange = (
	berth: BerthSite,
): Effect.Effect<ChangePreparationEvidence, RunnerError> =>
	Effect.gen(function* () {
		const evidence = yield* runGit(captureWorktreeChange(berth.path));
		const actualRoot = yield* canonicalPath(evidence.root);
		const expectedRoot = yield* canonicalPath(berth.path);
		if (evidence.branch !== berth.branch || actualRoot !== expectedRoot) {
			return yield* new RunnerProvisionConflict({
				detail: `${berth.path} is ${evidence.branch} at ${actualRoot}, expected ${berth.branch} at ${expectedRoot}`,
				tag: "local",
			});
		}
		return {
			branch: evidence.branch,
			headSha: evidence.headSha,
			workingDiff: evidence.workingDiff,
			workingTreeStatus: evidence.workingTreeStatus,
			worktreePath: berth.path,
		};
	});
