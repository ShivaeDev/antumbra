import type { BerthStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect } from "effect";
import { invalidResourceReclaimClaim } from "#resource-reclaim-claim-shape.ts";
import type { ResourceReclaimClaimInvalid } from "#resource-reclaim-errors.ts";
import type { ResourceReclaimSnapshot } from "#resource-reclaim-state.ts";

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

interface ResourceReclaimSelection {
	readonly berth: ClaimedBerth;
	readonly needsClaim: boolean;
}

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
	const eligibleAgents = eligibleAgentIds(state, moorageOf);
	const invalid = invalidResourceReclaimClaim(state, moorageOf, eligibleAgents);
	if (invalid !== undefined) {
		return Effect.fail(invalid);
	}
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
