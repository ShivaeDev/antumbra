import type { VoyageWorld } from "#voyage-rows.ts";

export type VoyageDetailRows = Omit<VoyageWorld, "openRulings" | "voyages">;
