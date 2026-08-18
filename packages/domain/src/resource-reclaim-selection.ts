import type { BerthStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { ResourceReclaimClaimInvalid } from "#errors.ts";
import type { readResourceReclaimState } from "#resource-reclaim-state.ts";

export interface ClaimedBerth {
	readonly agentId: string;
	readonly branch: string;
	readonly id: string;
	readonly path: string;
	readonly runner: string;
	readonly slug: string;
	readonly source: string;
	readonly status: BerthStatus;
	readonly strandedAt: Date | null;
}

export interface ResourceReclaimSelection {
	readonly berth: ClaimedBerth;
	readonly needsClaim: boolean;
}

type ResourceReclaimSnapshot = Effect.Success<typeof readResourceReclaimState>;
type ReclaimBerth = ResourceReclaimSnapshot["berths"][number];
type ReclaimMoorage = ResourceReclaimSnapshot["moorages"][number];

const isFailedSetup = (
	agentId: string,
	moorageStatus: string,
	sessions: ResourceReclaimSnapshot["sessions"],
): boolean =>
	moorageStatus === "provisioning" ||
	sessions
		.filter((session) => session.agentId === agentId)
		.every((session) => session.status === "closed");

const eligibleAgentIds = (
	state: ResourceReclaimSnapshot,
	moorageOf: ReadonlyMap<string, ReclaimMoorage>,
): ReadonlySet<string> =>
	new Set(
		state.agents.flatMap((agent) => {
			const moorage = moorageOf.get(agent.agentId);
			return moorage !== undefined &&
				(agent.status === "retired" ||
					(agent.status === "dormant" &&
						isFailedSetup(agent.agentId, moorage.status, state.sessions)))
				? [agent.agentId]
				: [];
		}),
	);

const claimShapeError = (
	state: ResourceReclaimSnapshot,
	moorageOf: ReadonlyMap<string, ReclaimMoorage>,
): ResourceReclaimClaimInvalid | undefined => {
	for (const moorage of state.moorages) {
		if (
			moorage.reclaimState === "claimed" &&
			!state.berths.some(
				(berth) =>
					berth.agentId === moorage.agentId && berth.reclaimState === "claimed",
			)
		) {
			return new ResourceReclaimClaimInvalid({
				agentId: moorage.agentId,
				detail: "Moorage is claimed without an exact Berth",
			});
		}
	}
	for (const berth of state.berths) {
		if (
			berth.reclaimState === "claimed" &&
			moorageOf.get(berth.agentId)?.reclaimState !== "claimed"
		) {
			return new ResourceReclaimClaimInvalid({
				agentId: berth.agentId,
				detail: `Berth ${berth.id} is claimed without its Moorage`,
			});
		}
	}
};

const isNewClaimCandidate = (
	berth: ReclaimBerth,
	moorage: ReclaimMoorage | undefined,
	eligibleAgents: ReadonlySet<string>,
	heldAgents: ReadonlySet<string>,
	held: ReadonlyMap<string, unknown>,
	runnerTags: ReadonlySet<string>,
): boolean =>
	moorage !== undefined &&
	moorage.runner === berth.runner &&
	eligibleAgents.has(berth.agentId) &&
	!heldAgents.has(berth.agentId) &&
	runnerTags.has(berth.runner) &&
	berth.status !== "reclaimed" &&
	!held.has(berth.id);

export const selectResourceReclaimBerths = (
	state: ResourceReclaimSnapshot,
	runnerTags: ReadonlySet<string>,
): Effect.Effect<
	ReadonlyArray<ResourceReclaimSelection>,
	ResourceReclaimClaimInvalid
> => {
	const moorageOf = new Map(
		state.moorages.map((moorage) => [moorage.agentId, moorage] as const),
	);
	const invalid = claimShapeError(state, moorageOf);
	if (invalid !== undefined) {
		return Effect.fail(invalid);
	}
	const eligibleAgents = eligibleAgentIds(state, moorageOf);
	const heldAgents = new Set(
		state.berths
			.filter((berth) => state.held.has(berth.id))
			.map((berth) => berth.agentId),
	);
	return Effect.succeed(
		state.berths.flatMap<ResourceReclaimSelection>((berth) => {
			if (berth.reclaimState === "claimed") {
				return [{ berth, needsClaim: false }];
			}
			return isNewClaimCandidate(
				berth,
				moorageOf.get(berth.agentId),
				eligibleAgents,
				heldAgents,
				state.held,
				runnerTags,
			)
				? [{ berth, needsClaim: true }]
				: [];
		}),
	);
};
