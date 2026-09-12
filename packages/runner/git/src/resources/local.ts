import { Effect, Semaphore } from "effect";
import type { GitProcess } from "#process.ts";
import { refreshBerth } from "#resources/berth-refresh.ts";
import { captureChange } from "#resources/change-evidence.ts";
import { ensureDirectory, Machine, pathExists } from "#resources/machine.ts";
import { ensureMirror } from "#resources/mirrors.ts";
import type { BerthPlan, BerthSite, MooragePlan, ReclaimVerdict, RunnerError } from "#resources/model.ts";
import { createWorktree, isClean, reclaimMissingWorktree, remountWorktree, removeWorktree, verifyWorktree } from "#resources/worktrees.ts";

export interface LocalRunnerRoots {
	readonly moorageRoot: string;
	readonly reposRoot: string;
}

const provisionInto = (roots: LocalRunnerRoots, plan: MooragePlan) =>
	Effect.forEach(
		plan.berths,
		Effect.fnUntraced(function* (berth: BerthPlan) {
			const machine = yield* Machine;
			const mirror = machine.join(roots.reposRoot, machine.mirrorName(berth.slug, berth.source));
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

export const makeLocalRunner = (roots: LocalRunnerRoots) => {
	// Moorages share one mirror per source, and git leaves a concurrent clone or fetch of it half written.
	const mirrors = Semaphore.makeUnsafe(1);
	return {
		captureChange,
		provision: Effect.fn("RunnerLocal.provision")(
			(plan: MooragePlan): Effect.Effect<void, RunnerError, GitProcess | Machine> =>
				mirrors.withPermit(
					Effect.gen(function* () {
						yield* ensureDirectory(plan.root);
						if (plan.berths.length > 0) {
							yield* ensureDirectory(roots.reposRoot);
						}
						yield* provisionInto(roots, plan);
					}),
				),
		),
		reclaim: Effect.fn("RunnerLocal.reclaim")(function* (site: BerthSite): Effect.fn.Return<ReclaimVerdict, RunnerError, GitProcess | Machine> {
			const machine = yield* Machine;
			const mirror = machine.join(roots.reposRoot, machine.mirrorName(site.slug, site.source));
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
		scrap: (site: BerthSite) =>
			Effect.flatMap(Machine, (machine) => removeWorktree(machine.join(roots.reposRoot, machine.mirrorName(site.slug, site.source)), site)),
		tag: "local",
	};
};
