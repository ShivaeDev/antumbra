import { ResourceReclaimClaimInvalid } from "#resource-reclaim-errors.ts";
import type { ResourceReclaimSnapshot } from "#resource-reclaim-state.ts";

type ReclaimMoorage = ResourceReclaimSnapshot["moorages"][number];

export const invalidResourceReclaimClaim = (
	state: ResourceReclaimSnapshot,
	moorageOf: ReadonlyMap<string, ReclaimMoorage>,
	eligibleAgents: ReadonlySet<string>,
): ResourceReclaimClaimInvalid | undefined => {
	for (const moorage of state.moorages) {
		if (
			moorage.reclaimState === "claimed" &&
			!eligibleAgents.has(moorage.agentId)
		) {
			return new ResourceReclaimClaimInvalid({
				agentId: moorage.agentId,
				detail: "Moorage is claimed for an Agent that is not reclaimable",
			});
		}
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
			!eligibleAgents.has(berth.agentId)
		) {
			return new ResourceReclaimClaimInvalid({
				agentId: berth.agentId,
				detail: `Berth ${berth.id} is claimed for an Agent that is not reclaimable`,
			});
		}
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
