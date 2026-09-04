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

export const isVoyageCaptainIdentity = (role: string, identity: SessionIdentity) =>
	role === CAPTAIN_ROLE && Option.isSome(identity.voyageId) && Option.isNone(identity.pieceId);

export const isFlagshipCaptainIdentity = (world: VoyageWorld, role: string, identity: SessionIdentity): boolean =>
	isVoyageCaptainIdentity(role, identity) &&
	Option.match(identity.voyageId, {
		onNone: () => false,
		onSome: (voyageId) => world.voyages.some((voyage) => voyage.id === voyageId && voyage.kind === "flagship"),
	});

type CaptainWorld = Pick<VoyageWorld, "agentStatus" | "assignments" | "crews" | "currentSessionByAgent" | "sessions">;

const isPieceAssigned = (world: CaptainWorld, agentId: string) => world.assignments.some((assignment) => assignment.agentId === agentId);

const captains = (world: CaptainWorld, voyageId: string): ReadonlyArray<VoyageCrewMember> =>
	crewOf(world, voyageId).filter((member) => member.role === CAPTAIN_ROLE && !isPieceAssigned(world, member.agentId));

const asCaptain = (world: CaptainWorld, member: VoyageCrewMember): VoyageCaptain => ({
	agentId: member.agentId,
	atWork: atWork(world, member.agentId),
	sessionId: member.status === "alive" ? (executionSessionOfAgent(world, member.agentId)?.id ?? null) : null,
	status: member.status,
});

const hailedLast = (world: CaptainWorld, members: ReadonlyArray<VoyageCrewMember>): VoyageCrewMember | undefined => {
	const born = [...world.agentStatus.keys()];
	const at = (member: VoyageCrewMember) => born.indexOf(member.agentId);
	return [...members].sort((left, right) => at(left) - at(right)).at(-1);
};

export const captainAtWork = (world: CaptainWorld, voyageId: string): Option.Option<VoyageCaptain> =>
	Option.map(Option.fromUndefinedOr(captains(world, voyageId).find((member) => atWork(world, member.agentId))), (member) => asCaptain(world, member));

export const captainOf = (world: CaptainWorld, voyageId: string): Option.Option<VoyageCaptain> => {
	const working = captainAtWork(world, voyageId);
	if (Option.isSome(working)) {
		return working;
	}
	return Option.map(Option.fromUndefinedOr(hailedLast(world, captains(world, voyageId))), (member) => asCaptain(world, member));
};
