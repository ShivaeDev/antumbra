import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { pieceChange } from "#rows/piece-change.ts";
export const links = query("links", {
	input: {},
	output: Schema.Array(pieceChange.Row),
	reads: [pieceChange],
});
