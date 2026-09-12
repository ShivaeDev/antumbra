import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const others = query("others", {
	input: { id: PieceId, voyageId: VoyageId },
	output: Schema.Array(piece.Row),
	reads: [piece],
	scope: (input) => input.voyageId,
	run: Effect.fn("Pieces.others")(function* (input, rows) {
		const stored = yield* rows.piece.where({ voyageId: input.voyageId });
		const besides = stored.filter((row) => row.id !== input.id);
		return besides.toSorted((left, right) => left.charteredAt.localeCompare(right.charteredAt));
	}),
});
