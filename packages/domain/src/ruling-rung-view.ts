import type { RulingRungView } from "@antumbra/contract";
import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import type { VoyageWorld } from "#voyage-rows.ts";

const ADMIRAL: RulingRungView = { kind: "admiral" };

const captainRung = (world: VoyageWorld, agentId: string): RulingRungView | undefined => {
	const voyageId = world.crews.find((crew) => crew.agentId === agentId)?.voyageId;
	const voyage = world.voyages.find((row) => row.id === voyageId);
	return voyage === undefined ? undefined : { kind: "captain", voyageId: voyage.id, voyageName: voyage.name };
};

export const rungSeen = (ruling: Ruling, world: VoyageWorld): RulingRungView =>
	Option.match(ruling.rung, {
		onNone: () => ADMIRAL,
		onSome: (rung) => {
			if (rung !== "captain") {
				return { kind: rung };
			}
			const requester = ruling.requester;
			return requester.kind === "agent" ? (captainRung(world, requester.agentId) ?? ADMIRAL) : ADMIRAL;
		},
	});
