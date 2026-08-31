import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import { captainOf } from "#voyage-captain.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

const flagshipCaptain = (world: VoyageWorld): Option.Option<string> => {
	const flagship = world.voyages.find((voyage) => voyage.kind === "flagship");
	return flagship === undefined ? Option.none() : Option.map(captainOf(world, flagship.id), (captain) => captain.agentId);
};

const captainOver = (world: VoyageWorld, agentId: string): Option.Option<string> =>
	Option.flatMap(Option.fromUndefinedOr(world.crews.find((crew) => crew.agentId === agentId)?.voyageId), (voyageId) =>
		Option.map(captainOf(world, voyageId), (captain) => captain.agentId),
	);

export const rungHolder = (world: VoyageWorld, ruling: Ruling): Option.Option<string> => {
	const requester = ruling.requester;
	if (requester.kind !== "agent") {
		return Option.none();
	}
	return Option.flatMap(ruling.rung, (rung) => {
		if (rung === "flagship") {
			return flagshipCaptain(world);
		}
		return rung === "captain" ? captainOver(world, requester.agentId) : Option.none();
	});
};
