import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const dependencies = query("dependencies", {
	input: { id: PieceId },
	output: Schema.Array(Schema.Struct({ id: PieceId, title: Schema.String })),
	reads: [piece, pieceEdge],
});
