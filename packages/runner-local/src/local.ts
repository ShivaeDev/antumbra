import { join } from "node:path";
import type { AntumbraPlugin, BerthPlan, MooragePlan, ProvisionRequest, Runner } from "@antumbra/plugin-api";
import { Effect } from "effect";
import { ensureDirectory, pathExists } from "#adapters/fs.ts";
import { captureChange } from "#change-evidence.ts";
import { ensureMirror } from "#mirrors.ts";
import { mirrorName, workBranch } from "#naming.ts";
import { createWorktree, isClean, reclaimMissingWorktree, remountWorktree, removeWorktree, scrapWorktree, verifyWorktree } from "#worktrees.ts";

export interface LocalRunnerRoots {
	readonly moorageRoot: string;
	readonly reposRoot: string;
}

// why: the runner never invents a repository's name. It lays out the folder
// the request already spells, so the berth an agent stands in and the name a
// change tool answers to cannot drift apart.
const planBerths = (root: string, request: ProvisionRequest): ReadonlyArray<BerthPlan> =>
	request.repos.map((repo) => ({
		branch: workBranch(request.agentId, repo.slug),
		path: join(root, repo.slug),
		ref: repo.ref,
		slug: repo.slug,
		source: repo.source,
	}));

const planMoorage = (roots: LocalRunnerRoots, request: ProvisionRequest): MooragePlan => {
	const root = join(roots.moorageRoot, request.agentId);
	return { berths: planBerths(root, request), root };
};

const provisionInto = (roots: LocalRunnerRoots, plan: MooragePlan) =>
	Effect.forEach(
		plan.berths,
		(berth) =>
			Effect.gen(function* () {
				const mirror = join(roots.reposRoot, mirrorName(berth.slug, berth.source));
				if (yield* pathExists(berth.path)) {
					yield* verifyWorktree(mirror, berth);
					return;
				}
				if ((yield* pathExists(mirror)) && (yield* remountWorktree(mirror, berth))) {
					return;
				}
				// why: source access is the fallback only after durable mirror state
				// proves there is no planned branch to recover locally.
				yield* ensureMirror(roots.reposRoot, berth);
				yield* createWorktree(mirror, berth);
			}),
		{ concurrency: 1, discard: true },
	);

export const makeLocalRunner = (roots: LocalRunnerRoots): Runner => ({
	captureChange,
	capabilities: { liveTerminal: false },
	plan: (request) => planMoorage(roots, request),
	provision: (plan) =>
		Effect.gen(function* () {
			yield* ensureDirectory(plan.root);
			if (plan.berths.length > 0) {
				yield* ensureDirectory(roots.reposRoot);
			}
			yield* provisionInto(roots, plan);
		}),
	reclaim: (site) =>
		Effect.gen(function* () {
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
	scrap: (site) => scrapWorktree(join(roots.reposRoot, mirrorName(site.slug, site.source)), site),
	tag: "local",
});

export const localRunnerPlugin = (roots: LocalRunnerRoots): AntumbraPlugin => ({
	activate: (context) => context.registerRunner(makeLocalRunner(roots)),
	name: "local-runner",
});
