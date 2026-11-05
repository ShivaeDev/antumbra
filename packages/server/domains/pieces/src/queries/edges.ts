import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceEdge } from "#rows/piece-edge.ts";

export const edges = query("edges", {
	input: { voyageId: VoyageId },
	output: Schema.Array(pieceEdge.Row),
	reads: [piece, pieceEdge],
});
