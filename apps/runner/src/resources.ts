import { type LocalRunnerRoots, makeLocalRunner as makeResources } from "@antumbra/runner-git/resources/local.ts";
import type { ProvisionRequest } from "@antumbra/runner-git/resources/model.ts";
import { workBranch } from "@antumbra/runner-git/resources/naming.ts";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { gitProcess } from "#adapters/git.ts";
import { machine, machineLayer } from "#adapters/machine.ts";

const resourceLayer = Layer.merge(machineLayer, gitProcess.pipe(Layer.provide(NodeServices.layer)));
export const makeLocalRunner = (roots: LocalRunnerRoots) => {
	const resources = makeResources(roots);
	return {
		tag: resources.tag,
		plan: (request: ProvisionRequest) => {
			const root = machine.join(roots.moorageRoot, request.agentId);
			return {
				root,
				berths: request.repos.map((repo) => ({ ...repo, path: machine.join(root, repo.slug), branch: workBranch(request.agentId, repo.slug) })),
			};
		},
		provision: (plan: Parameters<typeof resources.provision>[0]) => resources.provision(plan).pipe(Effect.provide(resourceLayer)),
		reclaim: (site: Parameters<typeof resources.reclaim>[0]) => resources.reclaim(site).pipe(Effect.provide(resourceLayer)),
		scrap: (site: Parameters<typeof resources.scrap>[0]) => resources.scrap(site).pipe(Effect.provide(resourceLayer)),
		captureChange: (site: Parameters<typeof resources.captureChange>[0]) => resources.captureChange(site).pipe(Effect.provide(resourceLayer)),
	};
};
export type LocalRunner = ReturnType<typeof makeLocalRunner>;
