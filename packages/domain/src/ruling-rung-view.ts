import type { RulingRungView } from "@antumbra/contract";
import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import type { GatedPieceRows } from "#ruling-gated-pieces.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export type RungRows = Pick<VoyageWorld, "crews"> & Pick<GatedPieceRows, "voyages">;

const ADMIRAL: RulingRungView = { kind: "admiral" };

const captainRung = (world: RungRows, agentId: string): RulingRungView | undefined => {
	const voyageId = world.crews.find((crew) => crew.agentId === agentId)?.voyageId;
	const voyage = world.voyages.find((row) => row.id === voyageId);
	return voyage === undefined ? undefined : { kind: "captain", voyageId: voyage.id, voyageName: voyage.name };
};

export const rungSeen = (ruling: Ruling, world: RungRows): RulingRungView =>
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
