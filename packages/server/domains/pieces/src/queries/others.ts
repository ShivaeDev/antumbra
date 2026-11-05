import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const others = query("others", {
	input: { id: PieceId, voyageId: VoyageId },
	output: Schema.Array(piece.Row),
	reads: [piece],
	scope: (input) => input.voyageId,
});
