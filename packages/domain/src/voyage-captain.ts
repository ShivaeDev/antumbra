import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { crewOf, type VoyageCrewMember } from "#voyage-crew.ts";
import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export const CAPTAIN_ROLE = "captain";

export interface VoyageCaptain {
	readonly agentId: string;
	readonly atWork: boolean;
	readonly sessionId: string | null;
	readonly status: string;
}

// why: "captain" may describe a Piece's requested worker role, but Voyage
// captain authority belongs only to an Agent that answers directly to the
// Voyage rather than through a Piece.
export const isVoyageCaptainIdentity = (role: string, identity: SessionIdentity) =>
	role === CAPTAIN_ROLE && Option.isSome(identity.voyageId) && Option.isNone(identity.pieceId);

// why: the fleet's highest-level agent is not a rank of its own — it is the
// captain of the one voyage whose kind speaks for the fleet. The kind is read
// off the same world every other reading of a captain's voyage comes from, so
// a voyage that stopped being the flagship stops conferring the station.
export const isFlagshipCaptainIdentity = (world: VoyageWorld, role: string, identity: SessionIdentity): boolean =>
	isVoyageCaptainIdentity(role, identity) &&
	Option.match(identity.voyageId, {
		onNone: () => false,
		onSome: (voyageId) => world.voyages.some((voyage) => voyage.id === voyageId && voyage.kind === "flagship"),
	});

const isPieceAssigned = (world: VoyageWorld, agentId: string) => world.assignments.some((assignment) => assignment.agentId === agentId);

const captains = (world: VoyageWorld, voyageId: string): ReadonlyArray<VoyageCrewMember> =>
	crewOf(world, voyageId).filter((member) => member.role === CAPTAIN_ROLE && !isPieceAssigned(world, member.agentId));

// why: the captain a view carries answers whether a hail would be accepted,
// and it answers with the same reading the hail itself refuses on — one truth
// rather than a status the window has to interpret again. The session is that
// same reading again: it is the one a hail resumes, and a hail resumes nothing
// for a captain whose agent is no longer alive.
const asCaptain = (world: VoyageWorld, member: VoyageCrewMember): VoyageCaptain => ({
	agentId: member.agentId,
	atWork: atWork(world, member.agentId),
	sessionId: member.status === "alive" ? (executionSessionOfAgent(world, member.agentId)?.id ?? null) : null,
	status: member.status,
});

// why: agents reach the world in the order they were born, so the last
// captain the world knows of is the one hailed most recently.
const hailedLast = (world: VoyageWorld, members: ReadonlyArray<VoyageCrewMember>): VoyageCrewMember | undefined => {
	const born = [...world.agentStatus.keys()];
	const at = (member: VoyageCrewMember) => born.indexOf(member.agentId);
	return [...members].sort((left, right) => at(left) - at(right)).at(-1);
};

export const captainAtWork = (world: VoyageWorld, voyageId: string): Option.Option<VoyageCaptain> =>
	Option.map(Option.fromUndefinedOr(captains(world, voyageId).find((member) => atWork(world, member.agentId))), (member) => asCaptain(world, member));

// why: a voyage may have been captained more than once, and a dormant captain
// is history rather than a vacancy — so the current captain is the one at
// work, and failing that the one hailed most recently.
export const captainOf = (world: VoyageWorld, voyageId: string): Option.Option<VoyageCaptain> => {
	const working = captainAtWork(world, voyageId);
	if (Option.isSome(working)) {
		return working;
	}
	return Option.map(Option.fromUndefinedOr(hailedLast(world, captains(world, voyageId))), (member) => asCaptain(world, member));
};
