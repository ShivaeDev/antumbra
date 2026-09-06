import { query } from "@antumbra/feature";
import { Effect, Schema } from "effect";
import { VoyageId } from "#example/ids.ts";
import { piece } from "#example/rows/piece.ts";

export const byVoyage = query("byVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(piece.Row),
	reads: [piece],
	scope: (input) => input.voyageId,
	run: Effect.fn("pieces.byVoyage")(function* (input, rows) {
		return yield* rows.piece.where({ voyageId: input.voyageId });
	}),
});
