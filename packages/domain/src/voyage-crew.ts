import type { VoyageWorld } from "#voyage-rows.ts";

export interface VoyageCrewMember {
	readonly agentId: string;
	readonly role: string;
	readonly status: string;
}

// why: a crew row says who answers to the voyage and in what role; whether
// that agent is still at work is the agent's own status, so the two are read
// together and never stored together.
export const crewOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<VoyageCrewMember> =>
	world.crews
		.filter((crew) => crew.voyageId === voyageId)
		.map((crew) => ({
			agentId: crew.agentId,
			role: crew.role,
			status: world.agentStatus.get(crew.agentId) ?? "unknown",
		}));
