import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import { captainOf } from "#voyage-captain.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

// why: the fleet's authority is not a rank of its own — it is the captain of
// the one voyage whose kind speaks for the fleet, read the way every other
// reading of a captain reads it.
const flagshipCaptain = (world: VoyageWorld): Option.Option<string> => {
	const flagship = world.voyages.find((voyage) => voyage.kind === "flagship");
	return flagship === undefined
		? Option.none()
		: Option.map(captainOf(world, flagship.id), (captain) => captain.agentId);
};

// why: a crew member's question waits on the captain of the ship it was asked
// on, so the voyage is read off the asker's crew row rather than off the
// ruling's subjects — the crew row is what says who the agent answers to.
const captainOver = (
	world: VoyageWorld,
	agentId: string,
): Option.Option<string> =>
	Option.flatMap(
		Option.fromUndefinedOr(
			world.crews.find((crew) => crew.agentId === agentId)?.voyageId,
		),
		(voyageId) =>
			Option.map(captainOf(world, voyageId), (captain) => captain.agentId),
	);

// why: an open request is owed to one agent — whoever holds the rung it waits
// on. A rung nobody holds yet is a wait rather than a failure: the pass reads
// the record again once a captain is hailed. Nothing is owed to the admiral
// here, because the admiral meets its rung in the window.
export const rungHolder = (
	world: VoyageWorld,
	ruling: Ruling,
): Option.Option<string> => {
	const requester = ruling.requester;
	if (requester.kind !== "agent") {
		return Option.none();
	}
	return Option.flatMap(ruling.rung, (rung) => {
		if (rung === "flagship") {
			return flagshipCaptain(world);
		}
		return rung === "captain"
			? captainOver(world, requester.agentId)
			: Option.none();
	});
};
