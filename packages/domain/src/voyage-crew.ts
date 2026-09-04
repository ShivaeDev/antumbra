import type { VoyageWorld } from "#voyage-rows.ts";

export interface VoyageCrewMember {
	readonly agentId: string;
	readonly role: string;
	readonly status: string;
}

export const crewOf = (world: Pick<VoyageWorld, "crews" | "agentStatus">, voyageId: string): ReadonlyArray<VoyageCrewMember> =>
	world.crews
		.filter((crew) => crew.voyageId === voyageId)
		.map((crew) => ({
			agentId: crew.agentId,
			role: crew.role,
			status: world.agentStatus.get(crew.agentId) ?? "unknown",
		}));
