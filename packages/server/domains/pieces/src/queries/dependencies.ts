import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const dependencies = query("dependencies", {
	input: { id: PieceId },
	output: Schema.Array(Schema.Struct({ id: PieceId, title: Schema.String })),
	reads: [piece, pieceEdge],
	run: Effect.fn("Pieces.dependencies")(function* (input, rows) {
		const edges = yield* rows.pieceEdge.where({ to: input.id });
		return yield* Effect.forEach(
			edges.toSorted((a, b) => a.from.localeCompare(b.from)),
			(edge) => Effect.map(rows.piece.get(edge.from), (source) => ({ id: source.id, title: source.title })),
		);
	}),
});
