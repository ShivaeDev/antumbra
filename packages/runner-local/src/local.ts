import { join } from "node:path";
import type { AntumbraPlugin, BerthPlan, BerthSite, MooragePlan, ProvisionRequest, ReclaimVerdict, Runner, RunnerError } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { ensureDirectory, pathExists } from "#adapters/fs.ts";
import { refreshBerth } from "#berth-refresh.ts";
import { captureChange } from "#change-evidence.ts";
import { ensureMirror } from "#mirrors.ts";
import { mirrorName, workBranch } from "#naming.ts";
import { createWorktree, isClean, reclaimMissingWorktree, remountWorktree, removeWorktree, verifyWorktree } from "#worktrees.ts";

export interface LocalRunnerRoots {
	readonly moorageRoot: string;
	readonly reposRoot: string;
}

const planBerths = (root: string, request: ProvisionRequest): ReadonlyArray<BerthPlan> =>
	request.repos.map((repo) => ({
		...repo,
		branch: workBranch(request.agentId, repo.slug),
		path: join(root, repo.slug),
	}));

const planMoorage = (roots: LocalRunnerRoots, request: ProvisionRequest): MooragePlan => {
	const root = join(roots.moorageRoot, request.agentId);
	return { berths: planBerths(root, request), root };
};

const provisionInto = (roots: LocalRunnerRoots, plan: MooragePlan) =>
	Effect.forEach(
		plan.berths,
		Effect.fnUntraced(function* (berth: BerthPlan) {
			const mirror = join(roots.reposRoot, mirrorName(berth.slug, berth.source));
			if (yield* pathExists(berth.path)) {
				yield* verifyWorktree(mirror, berth);
				return yield* refreshBerth(mirror, berth);
			}
			if ((yield* pathExists(mirror)) && (yield* remountWorktree(mirror, berth))) {
				return yield* refreshBerth(mirror, berth);
			}
			yield* ensureMirror(roots.reposRoot, berth);
			yield* createWorktree(mirror, berth);
		}),
		{ concurrency: 1, discard: true },
	);

export const makeLocalRunner = (roots: LocalRunnerRoots): Runner => ({
	captureChange,
	plan: (request) => planMoorage(roots, request),
	provision: Effect.fn("RunnerLocal.provision")(function* (plan: MooragePlan): Effect.fn.Return<void, RunnerError> {
		yield* ensureDirectory(plan.root);
		if (plan.berths.length > 0) {
			yield* ensureDirectory(roots.reposRoot);
		}
		yield* provisionInto(roots, plan);
	}),
	reclaim: Effect.fn("RunnerLocal.reclaim")(function* (site: BerthSite): Effect.fn.Return<ReclaimVerdict, RunnerError> {
		const mirror = join(roots.reposRoot, mirrorName(site.slug, site.source));
		if (!(yield* pathExists(site.path))) {
			return yield* reclaimMissingWorktree(mirror, site);
		}
		const clean = yield* isClean(site.path);
		if (!clean) {
			return { _tag: "dirty" as const };
		}
		yield* removeWorktree(mirror, site);
		return { _tag: "reclaimed" as const };
	}),
	scrap: (site) => removeWorktree(join(roots.reposRoot, mirrorName(site.slug, site.source)), site),
	tag: "local",
});

export const localRunnerPlugin = (roots: LocalRunnerRoots): AntumbraPlugin => ({
	activate: (context) => context.registerRunner(makeLocalRunner(roots)),
	name: "local-runner",
});
