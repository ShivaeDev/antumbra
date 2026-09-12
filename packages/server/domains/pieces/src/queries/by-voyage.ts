import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";

export const byVoyage = query("byVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(piece.Row),
	reads: [piece],
	scope: (input) => input.voyageId,
	run: Effect.fn("pieces.byVoyage")(function* (input, rows) {
		const stored = yield* rows.piece.where({ voyageId: input.voyageId });
		return stored.toSorted((left, right) => left.charteredAt.localeCompare(right.charteredAt));
	}),
});
