import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

export const displayByVoyage = query("displayByVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(Schema.Struct({ ...piece.fields, state: pieceProgress.fields.state })),
	reads: [piece, pieceProgress],
	scope: (input) => input.voyageId,
});
