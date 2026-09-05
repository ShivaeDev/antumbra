import { Option } from "effect";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { VoyageSummaryRows } from "#voyage-rows.ts";

export type VoyageState = "quiet" | "underWay";

export const piecesOfVoyage = (world: Pick<VoyageSummaryRows, "memberships">, voyageId: string): ReadonlyArray<string> =>
	world.memberships.filter((membership) => membership.voyageId === voyageId).map((membership) => membership.pieceId);

export const voyageState = (activePieces: number, captain: Option.Option<VoyageCaptain>): VoyageState =>
	activePieces > 0 || (Option.isSome(captain) && captain.value.atWork) ? "underWay" : "quiet";
