import type { StoredVoyage } from "@antumbra/persistence";
import { decodeStoredVoyageKind } from "@antumbra/vocabulary/voyage";
import { Effect } from "effect";
import { voyageRow } from "#voyage-row-projection.ts";

export const decodeVoyage = (voyage: StoredVoyage) =>
	Effect.fromResult(decodeStoredVoyageKind(voyage.id, voyage.kind)).pipe(Effect.map((kind) => voyageRow(voyage, kind)));
