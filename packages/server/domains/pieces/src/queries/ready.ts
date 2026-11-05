import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { piece } from "#rows/piece.ts";
import { pieceProgress } from "#rows/piece-progress.ts";

export const ready = query("ready", {
	input: {},
	output: Schema.Array(Schema.Struct({ piece: piece.Row, voyage: voyage.Row })),
	reads: [piece, pieceProgress, voyage],
});
