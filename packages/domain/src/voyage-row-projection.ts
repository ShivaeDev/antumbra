import type { VoyageKind } from "@antumbra/vocabulary/voyage.ts";
import type { VoyageRow } from "#voyage-rows.ts";

export const voyageRow = (row: Omit<VoyageRow, "kind">, kind: VoyageKind): VoyageRow => ({
	...row,
	kind,
});

export const byId = <A extends { readonly id: string }>(rows: ReadonlyArray<A>): ReadonlyMap<string, A> => new Map(rows.map((row) => [row.id, row]));
