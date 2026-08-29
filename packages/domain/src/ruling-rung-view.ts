import type { RulingRungView } from "@antumbra/contract";
import type { Ruling } from "@antumbra/rulings";
import { Option } from "effect";
import type { VoyageWorld } from "#voyage-rows.ts";

const ADMIRAL: RulingRungView = { kind: "admiral" };

// why: "the captain" names nobody in a fleet of them, so a captain rung reaches
// the window as the voyage whose captain holds it — the ship the asker answers
// to, read off its crew row. A rung whose voyage the fleet has lost is shown as
// the admiral's: the admiral meets every open ruling in the window anyway, and
// naming a ship that is gone would be worse than naming none.
const captainRung = (
	world: VoyageWorld,
	agentId: string,
): RulingRungView | undefined => {
	const voyageId = world.crews.find(
		(crew) => crew.agentId === agentId,
	)?.voyageId;
	const voyage = world.voyages.find((row) => row.id === voyageId);
	return voyage === undefined
		? undefined
		: { kind: "captain", voyageId: voyage.id, voyageName: voyage.name };
};

// why: a rule an authority wrote for itself waits on nobody, and it is met in
// the window like everything else the admiral holds.
export const rungSeen = (ruling: Ruling, world: VoyageWorld): RulingRungView =>
	Option.match(ruling.rung, {
		onNone: () => ADMIRAL,
		onSome: (rung) => {
			if (rung !== "captain") {
				return { kind: rung };
			}
			const requester = ruling.requester;
			return requester.kind === "agent"
				? (captainRung(world, requester.agentId) ?? ADMIRAL)
				: ADMIRAL;
		},
	});
