import { Option } from "effect";
import { atWork } from "#agent-at-work.ts";
import type { CrewRow, VoyageWorld } from "#voyage-rows.ts";

export const CAPTAIN_ROLE = "captain";

export interface VoyageCaptain {
	readonly agentId: string;
	readonly status: string;
}

const captainRows = (
	world: VoyageWorld,
	voyageId: string,
): ReadonlyArray<CrewRow> =>
	world.crews.filter(
		(crew) => crew.voyageId === voyageId && crew.role === CAPTAIN_ROLE,
	);

const asCaptain = (world: VoyageWorld, row: CrewRow): VoyageCaptain => ({
	agentId: row.agentId,
	status: world.agentStatus.get(row.agentId) ?? "unknown",
});

// why: agents reach the world in the order they were born, so the last
// captain the world knows of is the one hailed most recently.
const hailedLast = (
	world: VoyageWorld,
	rows: ReadonlyArray<CrewRow>,
): CrewRow | undefined => {
	const born = [...world.agentStatus.keys()];
	const at = (row: CrewRow) => born.indexOf(row.agentId);
	return [...rows].sort((left, right) => at(left) - at(right)).at(-1);
};

export const captainAtWork = (
	world: VoyageWorld,
	voyageId: string,
): Option.Option<VoyageCaptain> =>
	Option.map(
		Option.fromUndefinedOr(
			captainRows(world, voyageId).find((row) => atWork(world, row.agentId)),
		),
		(row) => asCaptain(world, row),
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
		Option.fromUndefinedOr(hailedLast(world, captainRows(world, voyageId))),
		(row) => asCaptain(world, row),
	);
};
