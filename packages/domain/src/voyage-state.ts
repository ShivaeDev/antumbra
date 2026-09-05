import { Option } from "effect";
import type { PieceState } from "#piece-state.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import { captainAtWork } from "#voyage-captain.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

export type VoyageState = "quiet" | "underWay";

export const piecesOfVoyage = (world: Pick<VoyageWorld, "memberships">, voyageId: string): ReadonlyArray<string> =>
	world.memberships.filter((membership) => membership.voyageId === voyageId).map((membership) => membership.pieceId);

export const voyageState = (world: VoyageDetailRows, states: ReadonlyMap<string, PieceState>, voyageId: string): VoyageState => {
	const working = piecesOfVoyage(world, voyageId).some((pieceId) => states.get(pieceId) === "active");
	return working || Option.isSome(captainAtWork(world, voyageId)) ? "underWay" : "quiet";
};
