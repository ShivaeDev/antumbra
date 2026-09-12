import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";

export const reach = query("reach", {
	input: { voyageId: VoyageId, pieceIds: Schema.Array(Schema.String) },
	output: Schema.Array(Schema.String),
	reads: [piece],
	scope: (input) => input.voyageId,
	run: Effect.fn("Pieces.reach")(function* (input, rows) {
		const members = new Set((yield* rows.piece.where({ voyageId: input.voyageId })).map((piece) => String(piece.id)));
		return input.pieceIds.filter((id) => !members.has(id));
	}),
});
