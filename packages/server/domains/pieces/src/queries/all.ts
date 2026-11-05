import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { piece } from "#rows/piece.ts";

export const all = query("all", {
	input: {},
	output: Schema.Array(piece.Row),
	reads: [piece],
});
