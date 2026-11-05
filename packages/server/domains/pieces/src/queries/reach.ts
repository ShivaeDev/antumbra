import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { piece } from "#rows/piece.ts";

export const reach = query("reach", {
	input: { voyageId: VoyageId, pieceIds: Schema.Array(Schema.String) },
	output: Schema.Array(Schema.String),
	reads: [piece],
	scope: (input) => input.voyageId,
});
