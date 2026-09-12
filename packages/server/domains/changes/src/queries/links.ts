import { query } from "@antumbra/platform-feature/query.ts";
import { Effect, Schema } from "effect";
import { pieceChange } from "#rows/piece-change.ts";
export const links = query("links", {
	input: {},
	output: Schema.Array(pieceChange.Row),
	reads: [pieceChange],
	run: Effect.fn("changes.links")(function* (_input, rows) {
		return yield* rows.pieceChange.where({});
	}),
});
