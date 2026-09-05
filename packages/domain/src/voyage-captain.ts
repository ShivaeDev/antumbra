import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import { crewOf, type VoyageCrewMember } from "#voyage-crew.ts";
import { executionSessionOfAgent } from "#voyage-execution-selection.ts";
import type { VoyageSummaryRows } from "#voyage-rows.ts";

export const CAPTAIN_ROLE = "captain";

export interface VoyageCaptain {
	readonly agentId: string;
	readonly atWork: boolean;
	readonly sessionId: string | null;
	readonly status: string;
}

type CaptainWorld = Pick<VoyageSummaryRows, "agentStatus" | "assignments" | "crews" | "currentSessionByAgent" | "sessions">;

const asCaptain = (world: CaptainWorld, member: VoyageCrewMember): VoyageCaptain => ({
	agentId: member.agentId,
	atWork: atWork(world, member.agentId),
	sessionId: member.status === "alive" ? (executionSessionOfAgent(world, member.agentId)?.id ?? null) : null,
	status: member.status,
});

const captains = (world: CaptainWorld, voyageId: string): ReadonlyArray<VoyageCrewMember> => {
	const assigned = new Set(world.assignments.map((assignment) => assignment.agentId));
	return crewOf(world, voyageId).filter((member) => member.role === CAPTAIN_ROLE && !assigned.has(member.agentId));
};

const workingCaptain = (world: CaptainWorld, members: ReadonlyArray<VoyageCrewMember>): Option.Option<VoyageCaptain> =>
	Option.map(Option.fromUndefinedOr(members.find((member) => atWork(world, member.agentId))), (member) => asCaptain(world, member));

const hailedLast = (world: CaptainWorld, members: ReadonlyArray<VoyageCrewMember>): VoyageCrewMember | undefined => {
	const candidates = new Map(members.map((member) => [member.agentId, member]));
	let latest = members.at(-1);
	for (const agentId of world.agentStatus.keys()) {
		latest = candidates.get(agentId) ?? latest;
	}
	return latest;
};

export const captainOf = (world: CaptainWorld, voyageId: string): Option.Option<VoyageCaptain> => {
	const members = captains(world, voyageId);
	const working = workingCaptain(world, members);
	if (Option.isSome(working)) return working;
	return Option.map(Option.fromUndefinedOr(hailedLast(world, members)), (member) => asCaptain(world, member));
};
