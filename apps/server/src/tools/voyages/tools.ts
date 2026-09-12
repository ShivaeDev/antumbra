import { charterVoyagePiece } from "#tools/voyages/charter.ts";
import { readFleet } from "#tools/voyages/fleet.ts";
import { hailCaptain } from "#tools/voyages/hail.ts";
import { openVoyage } from "#tools/voyages/open.ts";
import { readVoyage } from "#tools/voyages/read.ts";

export const commonVoyageTools = [readVoyage] as const;
export const flagshipVoyageTools = [readFleet, openVoyage, charterVoyagePiece, hailCaptain] as const;
