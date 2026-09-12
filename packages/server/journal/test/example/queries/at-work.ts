import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { piece } from "#example/rows/piece.ts";

export const atWork = query("atWork", {
	input: {},
	output: Schema.Array(piece.Row),
	reads: [piece],
	run: Effect.fn("pieces.atWork")(function* (_input, rows) {
		return yield* rows.piece.where({ status: "launched" });
	}),
});
