import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

const order = { active: 0, ready: 1, blocked: 2, landing: 3, held: 4, parked: 5, done: 6, abandoned: 7 };

export const displayByVoyage = query("displayByVoyage", {
	input: { voyageId: VoyageId },
	output: Schema.Array(Schema.Struct({ ...piece.fields, state: pieceProgress.fields.state })),
	reads: [piece, pieceProgress],
	scope: (input) => input.voyageId,
	run: Effect.fn("Pieces.displayByVoyage")(function* (input, rows) {
		const members = yield* rows.piece.where({ voyageId: input.voyageId });
		const displayed = yield* Effect.forEach(members, (piece) =>
			Effect.map(rows.pieceProgress.get(piece.id), (progress) => ({ ...piece, state: progress.state })),
		);
		return displayed.toSorted((a, b) => order[a.state] - order[b.state] || a.title.localeCompare(b.title));
	}),
});
