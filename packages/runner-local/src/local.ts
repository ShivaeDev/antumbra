import { join } from "node:path";
import type {
	AntumbraPlugin,
	ProvisionedBerth,
	ProvisionRequest,
	Runner,
} from "@antumbra/plugin-api";
import { Effect } from "effect";
import { ensureDirectory } from "#adapters/fs.ts";
import { ensureMirror } from "#mirrors.ts";
import { berthSlug, mirrorName, workBranch } from "#naming.ts";
import {
	addWorktree,
	isClean,
	removeWorktree,
	scrapWorktree,
} from "#worktrees.ts";

export interface LocalRunnerRoots {
	readonly berthsRoot: string;
	readonly reposRoot: string;
}

const provisionInto = (
	roots: LocalRunnerRoots,
	root: string,
	request: ProvisionRequest,
) =>
	Effect.gen(function* () {
		const berths: ProvisionedBerth[] = [];
		const taken = new Set<string>();
		for (const repo of request.repos) {
			const slug = berthSlug(repo.source, taken);
			taken.add(slug);
			const mirror = yield* ensureMirror(roots.reposRoot, repo.source);
			const path = join(root, slug);
			const branch = workBranch(request.agentId, slug);
			yield* addWorktree(mirror, path, branch, repo.ref);
			berths.push({ branch, path, ref: repo.ref, slug, source: repo.source });
		}
		return berths;
	});

export const makeLocalRunner = (roots: LocalRunnerRoots): Runner => ({
	capabilities: { liveTerminal: false },
	provision: (request) =>
		Effect.gen(function* () {
			const root = join(roots.berthsRoot, request.agentId);
			yield* ensureDirectory(root);
			if (request.repos.length > 0) {
				yield* ensureDirectory(roots.reposRoot);
			}
			const berths = yield* provisionInto(roots, root, request);
			return { berths, root };
		}),
	reclaim: (site) =>
		Effect.gen(function* () {
			const mirror = join(roots.reposRoot, mirrorName(site.source));
			const clean = yield* isClean(site.path);
			if (!clean) {
				return { _tag: "dirty" as const };
			}
			yield* removeWorktree(mirror, site);
			return { _tag: "reclaimed" as const };
		}),
	scrap: (site) =>
		scrapWorktree(join(roots.reposRoot, mirrorName(site.source)), site),
	tag: "local",
});

export const localRunnerPlugin = (roots: LocalRunnerRoots): AntumbraPlugin => ({
	activate: (context) => context.registerRunner(makeLocalRunner(roots)),
	name: "local-runner",
});
