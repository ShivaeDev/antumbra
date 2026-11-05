import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { PieceId } from "#ids.ts";
import { piece } from "#rows/piece.ts";

export const byId = query("byId", {
	input: { id: PieceId },
	output: Schema.NullOr(piece.Row),
	reads: [piece],
});
