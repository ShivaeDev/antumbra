import type {
	ChangeHost,
	MooragePlan,
	ProvisionRequest,
	Runner,
} from "@antumbra/plugin-api";
import { Effect, Ref } from "effect";

export interface ScriptedRunner {
	readonly provisioned: Effect.Effect<ReadonlyArray<MooragePlan>>;
	readonly runner: Runner;
}

const captureChange: Runner["captureChange"] = (berth) =>
	Effect.succeed({
		branch: berth.branch,
		headSha: `sha-${berth.branch}`,
		workingDiff: "",
		workingTreeStatus: "",
		worktreePath: berth.path,
	});

const reclaimed = () => Effect.succeed({ _tag: "reclaimed" as const });

export const makeScriptedRunner = Effect.gen(function* () {
	const plans = yield* Ref.make<ReadonlyArray<MooragePlan>>([]);
	const plan = (request: ProvisionRequest): MooragePlan => ({
		berths: request.repos.map((repo, index) => ({
			branch: `work/${request.agentId.slice(0, 8)}/berth-${index}`,
			path: `/tmp/moorage/${request.agentId}/berth-${index}`,
			ref: repo.ref,
			slug: `berth-${index}`,
			source: repo.source,
		})),
		root: `/tmp/moorage/${request.agentId}`,
	});
	const runner: Runner = {
		captureChange,
		capabilities: { liveTerminal: false },
		plan,
		provision: (provisionPlan) =>
			Ref.update(plans, (all) => [...all, provisionPlan]),
		reclaim: reclaimed,
		scrap: () => Effect.void,
		tag: "local",
	};
	return { provisioned: Ref.get(plans), runner } satisfies ScriptedRunner;
});

export const passiveRunner: Runner = {
	captureChange,
	capabilities: { liveTerminal: false },
	plan: (request) => ({
		berths: [],
		root: `/tmp/moorage/${request.agentId}`,
	}),
	provision: () => Effect.void,
	reclaim: reclaimed,
	scrap: () => Effect.void,
	tag: "local",
};

export const changeHostsOf = (
	...hosts: ReadonlyArray<ChangeHost>
): ReadonlyMap<string, ChangeHost> =>
	new Map(hosts.map((host) => [host.tag, host] as const));
