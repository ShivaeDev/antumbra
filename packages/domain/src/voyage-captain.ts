import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import { crewOf, type VoyageCrewMember } from "#voyage-crew.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export const CAPTAIN_ROLE = "captain";

export interface VoyageCaptain {
	readonly agentId: string;
	readonly status: string;
}

const captains = (
	world: VoyageWorld,
	voyageId: string,
): ReadonlyArray<VoyageCrewMember> =>
	crewOf(world, voyageId).filter((member) => member.role === CAPTAIN_ROLE);

const asCaptain = (member: VoyageCrewMember): VoyageCaptain => ({
	agentId: member.agentId,
	status: member.status,
});

// why: agents reach the world in the order they were born, so the last
// captain the world knows of is the one hailed most recently.
const hailedLast = (
	world: VoyageWorld,
	members: ReadonlyArray<VoyageCrewMember>,
): VoyageCrewMember | undefined => {
	const born = [...world.agentStatus.keys()];
	const at = (member: VoyageCrewMember) => born.indexOf(member.agentId);
	return [...members].sort((left, right) => at(left) - at(right)).at(-1);
};

export const captainAtWork = (
	world: VoyageWorld,
	voyageId: string,
): Option.Option<VoyageCaptain> =>
	Option.map(
		Option.fromUndefinedOr(
			captains(world, voyageId).find((member) => atWork(world, member.agentId)),
		),
		asCaptain,
	);

// why: a voyage may have been captained more than once, and a dormant captain
// is history rather than a vacancy — so the current captain is the one at
// work, and failing that the one hailed most recently.
export const captainOf = (
	world: VoyageWorld,
	voyageId: string,
): Option.Option<VoyageCaptain> => {
	const working = captainAtWork(world, voyageId);
	if (Option.isSome(working)) {
		return working;
	}
	return Option.map(
		Option.fromUndefinedOr(hailedLast(world, captains(world, voyageId))),
		asCaptain,
	);
};
